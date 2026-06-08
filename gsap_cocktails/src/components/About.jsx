import gsap from 'gsap';
import { SplitText} from 'gsap/all'
import { useGSAP } from '@gsap/react'
import { Link } from 'react-router-dom'

const About = () => {
 useGSAP(() => {
	const titleSplit = SplitText.create('#about h2', {
	 type: 'words'
	})
	
	const scrollTimeline = gsap.timeline({
	 scrollTrigger: {
		trigger: '#about',
		start: 'top center'
	 }
	})
	
	scrollTimeline
	 .from(titleSplit.words, {
		opacity: 0, duration: 1, yPercent: 100, ease: 'expo.out', stagger: 0.02
	})
	 .from('.top-grid div, .bottom-grid div', {
		opacity: 0, duration: 1, ease: 'power1.inOut', stagger: 0.04,
	}, '-=0.5')
 })
 
 return (
	<div id="about">
	 <div className="mb-16 md:px-0 px-5">
		<div className="content">
		 <div className="md:col-span-8">
			<p className="badge">MusAgent 平台</p>
			<h2>
			 让灵感<span className="text-white">被语言</span>唤醒
			</h2>
		 </div>
		 
		 <div className="sub-content">
			<p>
			 MusAgent 是一个基于多智能体协作的文学与艺术灵感生成平台。从意图识别到情感分析，从关键词抽取到风格匹配——七个专业 Agent 协同工作，为创作者提供全方位的灵感支持。
			</p>
			
			<div>
			 <p className="md:text-3xl text-xl font-bold">
				<span>7</span> Agents
			 </p>
			 <p className="text-sm text-white-100">
				协同创作 · 实时响应
			 </p>
			</div>
		 </div>
		</div>
	 </div>
	 
	 <div className="top-grid">
		<div className="md:col-span-3">
		 <div  className="noisy" />
		 <img src="/images/abt1.png" alt="grid-img-1" />
		</div>
		
		<div className="md:col-span-6">
		 <div  className="noisy" />
		 <img src="/images/abt2.png" alt="grid-img-2" />
		</div>
		
		<div className="md:col-span-3">
		 <div  className="noisy" />
		 <img src="/images/abt5.png" alt="grid-img-5" />
		</div>
	 </div>
	 
	 <div className="bottom-grid">
		<div className="md:col-span-8">
		 <div  className="noisy" />
		 <img src="/images/abt3.png" alt="grid-img-3" />
		</div>
		
		<div className="md:col-span-4">
		 <div  className="noisy" />
		 <img src="/images/abt4.png" alt="grid-img-4" />
		</div>
	 </div>
	 <div className="text-center mt-10 md:px-0 px-5">
		<Link to="/menu" className="inline-block px-8 py-3 rounded-full border border-white/20 hover:border-yellow hover:text-yellow transition-colors cursor-pointer">
		  探索知识库 →
		</Link>
	 </div>
	 
	</div>
 )
}
export default About
