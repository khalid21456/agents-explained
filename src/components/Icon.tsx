const PATHS: Record<string, string> = {
  play: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  next: 'M6 6.2v11.6a.8.8 0 0 0 1.24.66L15.6 13a1.2 1.2 0 0 0 0-2L7.24 5.54A.8.8 0 0 0 6 6.2zM16.5 5.5h2v13h-2z',
  prev: 'M18 6.2v11.6a.8.8 0 0 1-1.24.66L8.4 13a1.2 1.2 0 0 1 0-2l8.36-5.46A.8.8 0 0 1 18 6.2zM5.5 5.5h2v13h-2z',
  restart: 'M12 5a7 7 0 1 1-6.62 4.73l1.9.64A5 5 0 1 0 12 7v2.5L8 6l4-3.5z',
  loop: 'M7 7h9.5L14 4.5 15.4 3l5 5-5 5-1.4-1.5L16.5 9H7a3 3 0 0 0-3 3H2a5 5 0 0 1 5-5zm10 10H7.5L10 19.5 8.6 21l-5-5 5-5 1.4 1.5L7.5 15H17a3 3 0 0 0 3-3h2a5 5 0 0 1-5 5z',
  menu: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
  close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z',
  edit: 'M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm16.71-10.04a1 1 0 0 0 0-1.41l-2.51-2.51a1 1 0 0 0-1.41 0l-1.96 1.96 2.75 2.75 1.96-1.96z',
  'panel-left': 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h4V5H5zm6 0v14h8V5h-8z',
  'panel-right': 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h8V5H5zm10 0v14h4V5h-4z',
  check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z',
  copy: 'M8 3h10a2 2 0 0 1 2 2v12h-2V5H8zM5 7h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm0 2v11h10V9z',
}

export default function Icon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d={PATHS[name]} />
    </svg>
  )
}
