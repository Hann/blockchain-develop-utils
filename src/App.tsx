import { HashRouter, Route, Routes } from 'react-router'
import { AppLayout } from '@/layouts/AppLayout'
import { Home } from '@/pages/Home'
import { KeyGeneratorPage } from '@/pages/KeyGeneratorPage'
import { UnitConverterPage } from '@/pages/UnitConverterPage'
import { KeccakHashPage } from '@/pages/KeccakHashPage'
import { AbiCodecPage } from '@/pages/AbiCodecPage'
import { SignatureVerifierPage } from '@/pages/SignatureVerifierPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { NotFound } from '@/pages/NotFound'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="tools/key-generator" element={<KeyGeneratorPage />} />
          <Route path="tools/unit-converter" element={<UnitConverterPage />} />
          <Route path="tools/keccak-256" element={<KeccakHashPage />} />
          <Route path="tools/abi-codec" element={<AbiCodecPage />} />
          <Route
            path="tools/signature-verifier"
            element={<SignatureVerifierPage />}
          />
          <Route path="tools/:slug" element={<ComingSoonPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
