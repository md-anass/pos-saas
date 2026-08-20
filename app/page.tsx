import LandingUI from './components/LandingUI'
import { submitContactForm } from './actions/contact'

export default async function Home() {
  return <LandingUI contactAction={submitContactForm} />
}