import clsx from 'clsx'
import { IconLinkOutline14 } from '../base/icons.js'
import type { Source } from '../../services/chat/view.js'
import styles from './SiteLogo.module.css'

/** Use a local glyph so rendering results does not contact the source website. */
export const SiteLogo = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={clsx(styles.logo, styles.placeholder, styles.fallback, className)}
  >
    <IconLinkOutline14 />
  </span>
)

/** 搜索结果前 4 个站点的重叠缩略图 */
export const SiteThumbnails = ({ sources }: { sources: Source[] }) => (
  <span className={styles.group}>
    {sources.slice(0, 4).map((source) => (
      <SiteLogo key={source.url} className={styles.thumbnail} />
    ))}
  </span>
)
