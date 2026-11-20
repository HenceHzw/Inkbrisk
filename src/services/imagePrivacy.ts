const tagAt = (bytes: Uint8Array, offset: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4))

const pngMetadata = new Set(['eXIf', 'iTXt', 'tEXt', 'zTXt', 'tIME'])

const stripPng = (bytes: Uint8Array<ArrayBuffer>, view: DataView) => {
  const chunks: BlobPart[] = [bytes.subarray(0, 8)]
  for (let offset = 8; offset + 12 <= bytes.length; ) {
    const next = offset + 12 + view.getUint32(offset)
    if (next > bytes.length) {
      break
    }
    const tag = tagAt(bytes, offset + 4)
    if (!pngMetadata.has(tag)) {
      chunks.push(bytes.subarray(offset, next))
    }
    if (tag === 'IEND') {
      return new Blob(chunks, { type: 'image/png' })
    }
    offset = next
  }
  throw new Error('Invalid PNG')
}

const stripWebp = (bytes: Uint8Array<ArrayBuffer>, view: DataView) => {
  const header = bytes.slice(0, 12)
  const chunks: BlobPart[] = [header]
  const end = 8 + view.getUint32(4, true)
  if (end > bytes.length) {
    throw new Error('Invalid WebP')
  }
  let length = 4
  let offset = 12
  while (offset + 8 <= end) {
    const size = view.getUint32(offset + 4, true)
    const next = offset + 8 + size + (size % 2)
    if (next > end) {
      break
    }
    const tag = tagAt(bytes, offset)
    if (tag !== 'EXIF' && tag !== 'XMP ') {
      const chunk = bytes.slice(offset, next)
      if (tag === 'VP8X' && size >= 1) {
        // Signal that the EXIF and XMP chunks are absent.
        chunk[8] &= ~0x0c
      }
      chunks.push(chunk)
      length += chunk.length
    }
    offset = next
  }
  if (offset !== end) {
    throw new Error('Invalid WebP')
  }
  new DataView(header.buffer).setUint32(4, length, true)
  return new Blob(chunks, { type: 'image/webp' })
}

const encodeJpeg = async (file: File) => {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 4096 / Math.max(image.width, image.height))
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not prepare the image')
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.type !== 'image/jpeg') {
            reject(new Error('Could not encode the image'))
          } else {
            resolve(blob)
          }
        },
        'image/jpeg',
        0.94
      )
    })
  } finally {
    image.close()
  }
}

/** Strip photo metadata in the upload copy. PNG and WebP retain the original image chunks. */
export const stripPhotoMetadata = async (file: File) => {
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  let clean: Blob
  if (signature[0] === 0xff && signature[1] === 0xd8) {
    clean = await encodeJpeg(file)
  } else if (
    tagAt(signature, 0) === '\x89PNG' ||
    (tagAt(signature, 0) === 'RIFF' && tagAt(signature, 8) === 'WEBP')
  ) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const view = new DataView(bytes.buffer)
    clean = tagAt(signature, 0) === '\x89PNG' ? stripPng(bytes, view) : stripWebp(bytes, view)
  } else {
    return file
  }
  return new File([clean], file.name, { type: clean.type })
}
