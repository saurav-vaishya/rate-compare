# Rate Compare Utility

Local web app for GTM / ops teams to compare **v3** and **v4** freight API responses in the browser. No data leaves the machine.

## Quick start

```bash
cd rate-compare
npm install
npm run dev
```

Open http://localhost:5173

1. **Page 1** — Paste or upload full `v3Response.json` and `v4Response.json`
2. **Page 2** — Carrier matrix with expandable offer details

## Matrix 1 (implemented)

| Column | Description |
|--------|-------------|
| Liner / Carrier | Grouped by **carrier ID** (v3: `ratesBy.carrierId`, v4: `serviceProvider.id`). Names shown per API version for reference only. |
| v3 Offers | Valid offers with FREIGHT/BUY ocean leg |
| v3 Schedule Refs | Total `routeScheduleIds` across carrier offers |
| v3 Duplicate Schedules | Repeated sailing fingerprints within carrier |
| v4 Offers | Valid offers with mandatory **L3** leg + charges |
| v4 Schedule Refs | Total `meta.scheduleIds` across carrier offers |
| v4 Duplicate Schedules | Repeated sailing fingerprints within carrier |

**Expand a row** to see per-offer subsections:

- API version
- Liner / carrier
- Ocean freight cost (BUY)
- Service type
- Attached schedule sailing days
- Tariff, route, transit, schedule count, offer ID

## Validation rules

- **v4**: Offers without an `L3` leg containing charges are excluded (with warnings).
- **v3**: Offers without `FREIGHT` + `BUY` charges are excluded (ocean leg equivalent).

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [React Router](https://reactrouter.com/) for two-page flow
- `sessionStorage` for passing parsed JSON between pages

## Build for distribution

```bash
npm run build
npm run preview
```

Static files output to `dist/` — can be hosted on any static file server or opened via `npx serve dist`.
