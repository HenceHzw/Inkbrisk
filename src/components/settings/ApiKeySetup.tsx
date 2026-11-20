import { isAndroidApp } from '../../services/android.js'
import { useTranslate } from '../../i18n/index.js'
import { Button } from '../base/Button.js'
import { Modal } from '../base/Modal.js'
import { closeApiKeySetup, useApiKeySetup } from './settingsDialogState.js'
import { useApiKeyForm } from './useApiKeyForm.js'
import styles from './ApiKeySetup.module.css'

export const ApiKeySetup = () => {
  const open = useApiKeySetup((state) => state.open)
  return open ? <SetupForm /> : null
}

const SetupForm = () => {
  const t = useTranslate()
  const form = useApiKeyForm(closeApiKeySetup)

  return (
    <Modal
      title={t('apiKeyStart')}
      closable
      className={styles.dialog}
      onClose={() => {
        if (!form.verifying) {
          closeApiKeySetup()
        }
      }}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          void form.submit()
        }}
      >
        {!isAndroidApp ? (
          <input
            type="password"
            aria-label={t('apiKeyPlaceholder')}
            placeholder={t('apiKeyPlaceholder')}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={form.verifying}
            value={form.value}
            onChange={(event) => form.setValue(event.target.value)}
          />
        ) : null}
        <p className={styles.help}>{t('privacyIntro')}</p>
        {form.error ? (
          <div className={styles.error} role="alert">
            {form.error}
          </div>
        ) : null}
        <Button
          block
          type="submit"
          disabled={(!isAndroidApp && !form.value.trim()) || form.verifying}
        >
          {form.verifying ? t('apiKeyVerifying') : t('apiKeyConnect')}
        </Button>
        <p className={styles.help}>
          <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">
            {t('apiKeyCreate')}
          </a>
          <a
            href="https://cdn.deepseek.com/policies/zh-CN/deepseek-open-platform-privacy-policy.html"
            target="_blank"
            rel="noreferrer"
          >
            {t('deepSeekPrivacyPolicy')}
          </a>
          <span>{t('apiKeyBilling')}</span>
        </p>
      </form>
    </Modal>
  )
}
