import { useTranslate, type TranslationKey } from '../../i18n/index.js'
import { IconChevronDownOutline14 } from '../base/icons.js'
import styles from './DeepSeekPricing.module.css'

const chatPrices: { label: TranslationKey; flash: string; pro: string }[] = [
  { label: 'pricingCachedInput', flash: '0.02 / 0.04', pro: '0.15 / 0.30' },
  { label: 'pricingUncachedInput', flash: '1.00 / 2.00', pro: '4.50 / 9.00' },
  { label: 'pricingOutput', flash: '4.00 / 8.00', pro: '13.50 / 27.00' },
]

export const DeepSeekPricing = () => {
  const t = useTranslate()
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>
        {t('pricingTitle')}
        <IconChevronDownOutline14 />
      </summary>
      <div className={styles.body}>
        <table className={styles.table}>
          <caption>{t('pricingChatCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('pricingItem')}</th>
              <th scope="col">Flash</th>
              <th scope="col">V4 Pro</th>
            </tr>
          </thead>
          <tbody>
            {chatPrices.map(({ label, flash, pro }) => (
              <tr key={label}>
                <th scope="row">{t(label)}</th>
                <td>{flash}</td>
                <td>{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.note}>{t('pricingPeakHours')}</p>
        <dl className={styles.services}>
          <div>
            <dt>{t('pricingTts')}</dt>
            <dd>{t('pricingTtsRate')}</dd>
          </div>
          <div>
            <dt>{t('pricingAsr')}</dt>
            <dd>{t('pricingAsrRate')}</dd>
          </div>
          <div>
            <dt>{t('pricingFiles')}</dt>
            <dd>{t('pricingFilesRate')}</dd>
          </div>
          <div>
            <dt>{t('pricingSearch')}</dt>
            <dd>{t('pricingSearchRate')}</dd>
          </div>
        </dl>
        <p className={styles.note}>{t('pricingSnapshot', { date: '2026-11-20' })}</p>
        <a
          className={styles.link}
          href="https://api-docs.deepseek.com/zh-cn/quick_start/pricing/"
          target="_blank"
          rel="noreferrer"
        >
          {t('pricingOfficialLink')}
        </a>
      </div>
    </details>
  )
}
