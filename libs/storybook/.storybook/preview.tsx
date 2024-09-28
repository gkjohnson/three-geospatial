import { Preview } from '@storybook/react'
import React from 'react'

import './style.css'

const preview: Preview = {
  parameters: {
    options: {
      showPanel: false
    }
  },
  decorators: (Story, { parameters }) => <Story />
}

export default preview