import LandingUI from './components/LandingUI'

export default async function Home() {
  // Always show the public landing page, even if logged in
  return <LandingUI />
}