import { useEffect, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { deleteFile, listCloudFiles, type CloudFiles } from '../../services/api/client.js'
import { findLocalImages } from '../../services/chat/db.js'
import { useSettings } from '../../services/settings.js'
import { Button } from '../base/Button.js'
import { Modal } from '../base/Modal.js'
import { useFileView } from '../files/useFileView.js'
import styles from './CloudAttachments.module.css'

type CloudFile = CloudFiles['data'][number] & { localImage?: { id: string; name: string } }

export const CloudAttachments = ({ onClose }: { onClose: () => void }) => {
  const t = useTranslate()
  const apiKey = useSettings((state) => state.apiKey) ?? ''
  const [items, setItems] = useState<CloudFile[]>([])
  const [cursor, setCursor] = useState<string>()
  const [more, setMore] = useState(false)
  const [pageCursor, setPageCursor] = useState<string>()
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<CloudFile>()
  const [preview, setPreview] = useState<CloudFile>()
  const [deleteFailed, setDeleteFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setBusy(true)
    setError(false)
    void listCloudFiles(apiKey, pageCursor, controller.signal)
      .then(async (page) => {
        const localImages = await findLocalImages(
          page.data.map((file) => file.id),
          controller.signal
        ).catch(() => undefined)
        if (!controller.signal.aborted) {
          const files = page.data.map((file) => ({
            ...file,
            localImage: localImages?.get(file.id),
          }))
          setItems((previous) => (pageCursor ? [...previous, ...files] : files))
          setCursor(page.last_id)
          setMore(page.has_more && Boolean(page.last_id))
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBusy(false)
        }
      })
    return () => controller.abort()
  }, [apiKey, pageCursor, reload])

  const remove = async () => {
    if (!selected || deleting) {
      return
    }
    setDeleting(true)
    setDeleteFailed(false)
    try {
      await deleteFile(apiKey, selected.id)
      setItems((previous) => previous.filter((file) => file.id !== selected.id))
      setSelected(undefined)
    } catch {
      setDeleteFailed(true)
    } finally {
      setDeleting(false)
    }
  }

  const closeConfirm = () => {
    if (!deleting) {
      setSelected(undefined)
    }
  }

  return (
    <>
      <Modal title={t('cloudFiles')} closable onClose={onClose} mainClassName={styles.content}>
        <p>{t('cloudFilesScope')}</p>
        <ul className={styles.list}>
          {items.map((file) => (
            <li key={file.id}>
              {file.localImage ? (
                <button
                  type="button"
                  className={styles.previewLink}
                  aria-label={t('cloudFilePreviewNamed', { name: file.filename })}
                  onClick={() => setPreview(file)}
                >
                  {file.filename}
                </button>
              ) : (
                <span>{file.filename}</span>
              )}
              <Button
                variant="dangerOutlined"
                size="s"
                aria-label={t('cloudFileDeleteNamed', { name: file.filename })}
                onClick={() => {
                  setDeleteFailed(false)
                  setSelected(file)
                }}
              >
                {t('delete')}
              </Button>
            </li>
          ))}
        </ul>
        {busy ? <p role="status">{t('sessionLoading')}</p> : null}
        {error ? (
          <>
            <p role="alert">{t('cloudFilesLoadError')}</p>
            <Button size="s" variant="outlined" onClick={() => setReload((value) => value + 1)}>
              {t('retry')}
            </Button>
          </>
        ) : null}
        {!busy && !error && items.length === 0 ? <p>{t('cloudFilesEmpty')}</p> : null}
        {!busy && !error && more && cursor ? (
          <Button size="s" variant="outlined" onClick={() => setPageCursor(cursor)}>
            {t('cloudFilesMore')}
          </Button>
        ) : null}
      </Modal>
      {preview?.localImage ? (
        <CloudImagePreview
          id={preview.localImage.id}
          name={preview.localImage.name}
          filename={preview.filename}
          onClose={() => setPreview(undefined)}
        />
      ) : null}
      {selected ? (
        <Modal
          title={t('cloudFileDeleteTitle')}
          onClose={closeConfirm}
          footer={
            <>
              <Button disabled={deleting} variant="outlined" onClick={closeConfirm}>
                {t('cancel')}
              </Button>
              <Button disabled={deleting} variant="danger" onClick={() => void remove()}>
                {t('delete')}
              </Button>
            </>
          }
        >
          <p>{t('cloudFileDeleteDescription', { name: selected.filename })}</p>
          {deleteFailed ? <p role="alert">{t('cloudFileDeleteError')}</p> : null}
        </Modal>
      ) : null}
    </>
  )
}

const CloudImagePreview = ({
  id,
  name,
  filename,
  onClose,
}: {
  id: string
  name: string
  filename: string
  onClose: () => void
}) => {
  const t = useTranslate()
  const { url } = useFileView(id, name)
  const [failed, setFailed] = useState(false)
  return (
    <Modal
      title={<span className={styles.previewTitle}>{filename}</span>}
      closable
      onClose={onClose}
    >
      {failed || url === null ? (
        <p role="alert">{t('cloudFilePreviewError')}</p>
      ) : url ? (
        <img
          className={styles.previewImage}
          src={url}
          alt={filename}
          onError={() => setFailed(true)}
        />
      ) : null}
    </Modal>
  )
}
