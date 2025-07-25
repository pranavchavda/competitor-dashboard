import * as Headless from '@headlessui/react'
import { Link as RouterLink } from 'react-router'
import React, { forwardRef } from 'react'

interface LinkProps extends React.ComponentPropsWithoutRef<'a'> {
  href: string
}

export const Link = forwardRef(function Link(
  props: LinkProps,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const { href, ...otherProps } = props
  return (
    <Headless.DataInteractive>
      <RouterLink to={href} {...otherProps} ref={ref} />
    </Headless.DataInteractive>
  )
})
