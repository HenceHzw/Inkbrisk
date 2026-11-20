import { memo } from 'react'
import { useTranslate } from '../../i18n/index.js'
import type { DraftAttachment } from '../../services/chat/drafts.js'
import { IconCloseFill14 } from '../base/icons.js'
import { FileCard } from '../files/FileCard.js'
import { useFileView } from '../files/useFileView.js'
import styles from './ChatInput.module.css'

export const DraftAttachments = memo(function DraftAttachments({
  items,
  onRemove,
}: {
  items: DraftAttachment[]
  onRemove: (id: string) => void
}) {
  if (items.length === 0) {
    return null
  }
  return (
    <div className={styles.attachments}>
      {items.map((item) => (
        <AttachmentItem key={item.id} item={item} onRemove={() => onRemove(item.id)} />
      ))}
    </div>
  )
})

const AttachmentItem = ({ item, onRemove }: { item: DraftAttachment; onRemove: () => void }) => {
  const t = useTranslate()
  const { image, url, link } = useFileView(item.file, item.file.name)
  if (!image || url === null) {
    return <FileCard name={item.file.name} size={item.file.size} link={link} onRemove={onRemove} />
  }
  const preview = url ? <img src={url} alt={item.file.name} /> : null
  return (
    <div className={styles.attachment} title={item.file.name}>
      {link ? <a {...link}>{preview}</a> : preview}
      <button type="button" className={styles.remove} aria-label={t('delete')} onClick={onRemove}>
        <IconCloseFill14 />
      </button>
    </div>
  )
}
