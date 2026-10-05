export default function Icon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const paths = {
    home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />,
    building: <path d="M4 20V6l8-3 8 3v14M9 20v-5h6v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />,
    box: <path d="M3.5 8 12 4l8.5 4L12 12zM3.5 8v8L12 20l8.5-4V8M12 12v8" />,
    users: <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 20v-1.2a3 3 0 0 0-2.2-2.9M16 6.2a2.5 2.5 0 0 1 0 4.6" />,
    transfer: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
    wrench: <path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3L15 12l-3-3z" />,
    search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></>,
    qr: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />,
    chart: <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />,
    list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.6l1.6 1.6M17.6 15.8l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.4l1.6-1.6M17.6 8.2l1.6-1.6" /></>,
    logout: <path d="M10 7V5H5v14h5v-2M10 12h9M16 8l4 4-4 4" />,
    bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 18a2 2 0 0 0 4 0" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    chevron: <path d="m8 10 4 4 4-4" />,
  };

  return (
    <svg {...common} className="icon">
      {paths[name]}
    </svg>
  );
}
