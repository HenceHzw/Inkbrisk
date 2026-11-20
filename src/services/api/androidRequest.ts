import { registerPlugin } from '@capacitor/core'
import { createId } from '../../utils/id.js'

type RequestId = { id: string }

export const nativeApi = registerPlugin<{
  hasKey(): Promise<{ configured: boolean }>
  clearKey(): Promise<void>
  configureKey(options: {
    title: string
    hint: string
    confirm: string
    cancel: string
    invalid: string
    unavailable: string
  }): Promise<{ saved: boolean }>
  begin(options: RequestId): Promise<void>
  append(options: RequestId & { data: string }): Promise<void>
  open(
    options: RequestId & {
      method: string
      path: string
      contentType?: string
      filesBeta: boolean
    }
  ): Promise<{ status: number; contentType?: string }>
  read(options: RequestId): Promise<{ data?: string; done?: boolean }>
  cancel(options: RequestId): Promise<void>
}>('DeepSeekApi')

const stageBody = async (
  id: string,
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal | null
) => {
  const reader = body.getReader()
  const uploadChunkSize = 48 * 1024
  try {
    for (;;) {
      signal?.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) {
        return
      }
      for (let offset = 0; offset < value.length; offset += uploadChunkSize) {
        signal?.throwIfAborted()
        const bytes = value.subarray(offset, offset + uploadChunkSize)
        await nativeApi.append({ id, data: btoa(String.fromCharCode(...bytes)) })
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export const androidRequest = async (url: string, init: RequestInit) => {
  const endpoint = new URL(url)
  if (endpoint.origin !== 'https://api.deepseek.com') {
    throw new Error('Unsupported API origin')
  }
  const id = createId()
  let closed = false
  const close = () => {
    if (closed) {
      return
    }
    closed = true
    init.signal?.removeEventListener('abort', close)
    void nativeApi.cancel({ id }).catch(() => {})
  }

  init.signal?.throwIfAborted()
  await nativeApi.begin({ id })
  init.signal?.addEventListener('abort', close, { once: true })
  try {
    init.signal?.throwIfAborted()
    const body = init.body ? new Response(init.body) : null
    if (body?.body) {
      await stageBody(id, body.body, init.signal)
    }
    init.signal?.throwIfAborted()
    const headers = new Headers(init.headers)
    const { status, contentType } = await nativeApi.open({
      id,
      method: init.method ?? 'GET',
      path: endpoint.pathname + endpoint.search,
      contentType: headers.get('Content-Type') ?? body?.headers.get('Content-Type') ?? undefined,
      filesBeta: headers.has('anthropic-beta'),
    })
    init.signal?.throwIfAborted()
    const responseHeaders = contentType ? { 'Content-Type': contentType } : undefined
    if (status === 204 || status === 205 || status === 304) {
      close()
      return new Response(null, { status, headers: responseHeaders })
    }
    const output = new ReadableStream<Uint8Array<ArrayBuffer>>({
      async pull(controller) {
        try {
          init.signal?.throwIfAborted()
          const chunk = await nativeApi.read({ id })
          init.signal?.throwIfAborted()
          if (closed) {
            return
          }
          if (chunk.done) {
            close()
            controller.close()
          } else if (chunk.data) {
            controller.enqueue(Uint8Array.from(atob(chunk.data), (byte) => byte.charCodeAt(0)))
          }
        } catch (error) {
          if (closed && !init.signal?.aborted) {
            return
          }
          close()
          controller.error(error)
        }
      },
      cancel: close,
    })
    return new Response(output, { status, headers: responseHeaders })
  } catch (error) {
    close()
    throw error
  }
}
