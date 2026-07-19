import { NavLink, Outlet } from "react-router-dom";
import { useCampo } from "../context/CampoContext";
import SaveIndicator from "../components/SaveIndicator";

const NAV_ITEMS = [
  { to: "/ricette", label: "Ricette" },
  { to: "/menu", label: "Menù" },
  { to: "/campo", label: "Impostazioni campo" },
  { to: "/grammature", label: "Grammature" },
  { to: "/lista-spesa", label: "Lista spesa" },
  { to: "/magazzino", label: "Magazzino" },
  { to: "/acquisti-vari", label: "Acquisti vari" },
  { to: "/ingredienti", label: "Anagrafica ingredienti" },
  { to: "/backup", label: "Backup" },
];

export default function Layout() {
  const { campoAttivo } = useCampo();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">Cambusa Scout</div>
        <div className="sidebar-campo">
          {campoAttivo ? (
            <>
              Campo attivo
              <strong>{campoAttivo.nome}</strong>
            </>
          ) : (
            <span className="muted">Nessun campo attivo</span>
          )}
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
      <SaveIndicator />
    </div>
  );
}
