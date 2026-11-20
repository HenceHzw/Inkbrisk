import { Capacitor, registerPlugin } from '@capacitor/core'

export const isAndroidApp = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()

export const android = registerPlugin<{
  choosePhoto(options: { source: 'camera' | 'gallery' }): Promise<{
    name?: string
    path?: string
    mime?: string
  }>
  discardPhoto(options: { name: string }): Promise<void>
  openExternal(options: { url: string }): Promise<void>
  setWindowColor(options: { dark: boolean }): Promise<void>
  beginFile(): Promise<void>
  appendFile(options: { data: string }): Promise<void>
  saveFile(options: { name: string; mime: string }): Promise<void>
  discardFile(): Promise<void>
}>('MobileChat')

export const openExternal = (url: string) => {
  if (!/^https?:\/\//i.test(url)) {
    return
  }
  if (isAndroidApp) {
    void android.openExternal({ url }).catch(() => {})
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export const bindExternalLinks = () => {
  if (!isAndroidApp) {
    return
  }
  document.addEventListener('click', (event) => {
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!(anchor instanceof HTMLAnchorElement) || !/^https?:$/.test(anchor.protocol)) {
      return
    }
    event.preventDefault()
    openExternal(anchor.href)
  })
}

const encodeChunk = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export const saveDeviceFile = async (name: string, blob: Blob) => {
  if (!isAndroidApp) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return
  }

  // Limit each bridge message and stage the file on disk before opening the system picker.
  await android.beginFile()
  try {
    const chunkSize = 192 * 1024
    for (let offset = 0; offset < blob.size; offset += chunkSize) {
      const data = await encodeChunk(blob.slice(offset, offset + chunkSize))
      await android.appendFile({ data })
    }
    await android.saveFile({ name, mime: blob.type || 'application/octet-stream' })
  } finally {
    await android.discardFile()
  }
}

export const choosePhoto = async (source: 'camera' | 'gallery') => {
  const { name, path, mime } = await android.choosePhoto({ source })
  if (!name || !path || !mime) {
    return null
  }
  try {
    const response = await fetch(Capacitor.convertFileSrc(path))
    if (!response.ok) {
      throw new Error('Could not read the local photo')
    }
    return new File([await response.blob()], name, { type: mime })
  } finally {
    await android.discardPhoto({ name })
  }
}
