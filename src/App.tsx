import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout";
import { CampoProvider } from "./context/CampoContext";
import { SaveFeedbackProvider } from "./context/SaveFeedbackContext";
import IngredientiPage from "./pages/IngredientiPage";
import RicettePage from "./pages/RicettePage";
import CampoPage from "./pages/CampoPage";
import MenuPage from "./pages/MenuPage";
import GrammaturePage from "./pages/GrammaturePage";
import ListaSpesaPage from "./pages/ListaSpesaPage";
import MagazzinoPage from "./pages/MagazzinoPage";
import AcquistiVariPage from "./pages/AcquistiVariPage";
import BackupPage from "./pages/BackupPage";
import "./App.css";

export default function App() {
  return (
    <SaveFeedbackProvider>
      <CampoProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/ricette" replace />} />
              <Route path="/ricette" element={<RicettePage />} />
              <Route path="/ingredienti" element={<IngredientiPage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/campo" element={<CampoPage />} />
              <Route path="/grammature" element={<GrammaturePage />} />
              <Route path="/lista-spesa" element={<ListaSpesaPage />} />
              <Route path="/magazzino" element={<MagazzinoPage />} />
              <Route path="/acquisti-vari" element={<AcquistiVariPage />} />
              <Route path="/backup" element={<BackupPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </CampoProvider>
    </SaveFeedbackProvider>
  );
}
