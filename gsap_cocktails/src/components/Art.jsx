import gsap from 'gsap';
import { useMediaQuery } from 'react-responsive'
import { useGSAP } from '@gsap/react'
import { Link } from 'react-router-dom'
import { featureLists, goodLists } from '../../constants/index.js'

const Art = () => {
 const isMobile = useMediaQuery({ maxWidth: 767 });
 
 useGSAP(() => {
	const start = isMobile ? 'top 20%' : 'top top';
	
	const maskTimeline = gsap.timeline({
	 scrollTrigger: {
		trigger: '#art',
		start,
		end: 'bottom center',
		scrub: 1.5,
		pin: true
	 }
	})
	
	maskTimeline
	 .to('.will-fade', { opacity: 0, stagger: 0.2, ease: 'power1.inOut', })
	 .to('.masked-img', { scale: 1.3, maskPosition: 'center', maskSize: '400%', duration: 1, ease: 'power1.inOut '})
	 .to('#masked-content', { opacity: 1, duration: 1, ease: 'power1.inOut'})
 })
 
 return (
	<div id="art">
	 <div className="container mx-auto h-full pt-20">
		<h2 className="will-fade">灵感 · 艺术</h2>
		
		<div className="content">
		 <ul className="space-y-4 will-fade">
			{goodLists.map((feature, index) => (
			 <li key={index} className="flex items-center gap-2">
				<img src="/images/check.png" alt="check" />
				<p>{feature}</p>
			 </li>
			))}
		 </ul>
		 
		 <div className="cocktail-img">
			<img
				src="/images/under-img.jpg"
				alt="cocktail"
				className="abs-center masked-img size-full object-contain"
			/>
		 </div>
		 
		 <ul className="space-y-4 will-fade">
			{featureLists.map((feature, index) => (
			 <li key={index} className="flex items-center justify-start gap-2">
				<img src="/images/check.png" alt="check" />
				<p className="md:w-fit w-60">{feature}</p>
			 </li>
			))}
		 </ul>
		</div>
		
		<div className="masked-container">
		 <h2 className="will-fade">灵感，触手可及</h2>
		 <div id="masked-content">
			<h3>多 Agent 协作 · 智能创作</h3>
			<p>这不仅仅是一次文本分析。这是七个 AI Agent 为你精心编织的创意之旅。</p>
			<Link to="/about" className="inline-block mt-6 px-8 py-3 rounded-full border border-white/30 hover:border-yellow hover:text-yellow transition-colors cursor-pointer">
			  查看 Agent 工作流 →
			</Link>
		 </div>
		</div>
	 </div>
	</div>
 )
}
export default Art
