import { FLASH_MODEL, PRO_MODEL } from '../../services/api/types.js'
import { setModel, useSettings } from '../../services/settings.js'
import { useTranslate } from '../../i18n/index.js'
import { Select } from '../base/Select.js'

export const ModelSelect = () => {
  const t = useTranslate()
  const model = useSettings((state) => state.model)
  return (
    <Select
      ariaLabel={t('chatModel')}
      value={model}
      options={[
        { value: FLASH_MODEL, label: 'Flash' },
        { value: PRO_MODEL, label: t('chatModelPro') },
      ]}
      onChange={setModel}
    />
  )
}
