import React, { FC, SVGProps } from 'react';

// Small stroke icons (24×24 grid), drawn for MailChat.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Icon: FC<IconProps & { children: React.ReactNode }> = ({ size = 22, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
    {...props}
  >
    {children}
  </svg>
);

export const BackIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M15 18l-6-6 6-6' />
  </Icon>
);

export const ComposeIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M12 20h9' />
    <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' />
  </Icon>
);

export const PasteIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <rect x='8' y='2' width='8' height='4' rx='1' />
    <path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' />
    <path d='M9 14l2 2 4-4' />
  </Icon>
);

export const ShieldIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
    <path d='M9 12l2 2 4-4' />
  </Icon>
);

export const SendIcon: FC<IconProps> = props => (
  <Icon {...props}>
    {/* Nudged down-left: the plane's mass sits top-right of its box. */}
    <g transform='translate(-1.2 1.2)'>
      <path d='M22 2L11 13' />
      <path d='M22 2l-7 20-4-9-9-4z' />
    </g>
  </Icon>
);

export const ShareIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7' />
    <path d='M16 6l-4-4-4 4' />
    <path d='M12 2v13' />
  </Icon>
);

export const ChatsIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
  </Icon>
);

export const UserIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx='12' cy='8' r='4' />
    <path d='M4 21a8 8 0 0 1 16 0' />
  </Icon>
);

export const BellIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9' />
    <path d='M13.7 21a2 2 0 0 1-3.4 0' />
  </Icon>
);

export const CloseIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M18 6L6 18M6 6l12 12' />
  </Icon>
);

export const LockIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <rect x='4' y='11' width='16' height='10' rx='2' />
    <path d='M8 11V7a4 4 0 0 1 8 0v4' />
  </Icon>
);

export const ChevronIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M9 18l6-6-6-6' />
  </Icon>
);

export const CheckIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M4 12.5l4.5 4.5L20 5.5' />
  </Icon>
);

export const DoubleCheckIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M1.5 12.5L6 17 16.5 6.5' />
    <path d='M11 16l1 1L22.5 6.5' />
  </Icon>
);

export const ClockIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 7v5l3 2' />
  </Icon>
);

export const CopyIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <rect x='9' y='9' width='11' height='11' rx='2' />
    <path d='M5 15V6a2 2 0 0 1 2-2h8' />
  </Icon>
);

export const TrashIcon: FC<IconProps> = props => (
  <Icon {...props}>
    <path d='M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3' />
  </Icon>
);
