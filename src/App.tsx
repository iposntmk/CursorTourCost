import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './routes/DashboardPage';
import TourListPage from './routes/TourListPage';
import TourEditorPage from './routes/TourEditorPage';
import MasterDataPage from './routes/MasterDataPage';
import InstructionListPage from './routes/InstructionListPage';
import InstructionDetailPage from './routes/InstructionDetailPage';
import SchemaEditorPage from './routes/SchemaEditorPage';
import AiExtractionPage from './routes/AiExtractionPage';
import ExtractionLogPage from './routes/ExtractionLogPage';
import ReportsPage from './routes/ReportsPage';
import { QueryProvider } from './providers/QueryProvider';
import { TourDraftProvider } from './providers/TourDraftProvider';
import { ToastProvider } from './providers/ToastProvider';
import { ApiKeyProvider } from './providers/ApiKeyProvider';

const App = () => (
  <ToastProvider>
    <ApiKeyProvider>
      <QueryProvider>
        <TourDraftProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tours" element={<TourListPage />} />
                <Route path="/tours/new" element={<TourEditorPage />} />
                <Route path="/tours/:tourId" element={<TourEditorPage />} />
                <Route path="/master-data" element={<MasterDataPage />} />
                <Route path="/instructions" element={<InstructionListPage />} />
                <Route path="/instructions/:instructionId" element={<InstructionDetailPage />} />
                <Route path="/schemas" element={<SchemaEditorPage />} />
                <Route path="/ai" element={<AiExtractionPage />} />
                <Route path="/extractions" element={<ExtractionLogPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="*" element={<DashboardPage />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TourDraftProvider>
      </QueryProvider>
    </ApiKeyProvider>
  </ToastProvider>
);

export default App;
