
import HomePageClient from './components/HomePageClient';
import GaleriaAdopciones from './components/GaleriaAdopciones';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const serverComponents = {
    galeria: <GaleriaAdopciones />
  };


  return <HomePageClient serverComponents={serverComponents} />;
}
