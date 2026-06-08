import gsap from 'gsap';
import { ScrollTrigger, SplitText } from "gsap/all";
import { Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import CocktailsPage from './pages/CocktailsPage.jsx'
import MenuPage from './pages/MenuPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import ContactPage from './pages/ContactPage.jsx'

gsap.registerPlugin(ScrollTrigger, SplitText);

const App = () => {
 return (
	<main>
	 <Navbar />
	 <Routes>
		<Route path="/" element={<Home />} />
		<Route path="/cocktails" element={<CocktailsPage />} />
		<Route path="/menu" element={<MenuPage />} />
		<Route path="/about" element={<AboutPage />} />
		<Route path="/contact" element={<ContactPage />} />
	 </Routes>
	</main>
 )
}

export default App
