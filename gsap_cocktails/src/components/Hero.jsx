import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/all";
import { useRef } from "react";
import { useMediaQuery } from "react-responsive";
import { Link } from "react-router-dom";

const Hero = () => {
 const videoRef = useRef();
 const isMobile = useMediaQuery({ maxWidth: 767 });
 
 useGSAP(() => {
	const heroSplit = new SplitText(".title", {
	 type: "chars, words",
	});
	
	// Apply text-gradient class once before animating
	heroSplit.chars.forEach((char) => char.classList.add("text-gradient"));
	
	gsap.from(heroSplit.chars, {
	 yPercent: 100,
	 duration: 1.8,
	 ease: "expo.out",
	 stagger: 0.06,
	});
	
	gsap.from(".hero-desc", {
	 opacity: 0,
	 yPercent: 100,
	 duration: 1.8,
	 ease: "expo.out",
	 delay: 0.8,
	});
	
	gsap.from(".hero-yellow-tag", {
	 opacity: 0,
	 x: 40,
	 duration: 1.2,
	 ease: "power2.out",
	 delay: 1.2,
	});
	
	gsap
	.timeline({
	 scrollTrigger: {
		trigger: "#hero",
		start: "top top",
		end: "bottom top",
		scrub: true,
	 },
	})
	.to(".right-leaf", { y: 200 }, 0)
	.to(".left-leaf", { y: -200 }, 0)
	.to(".arrow", { y: 100 }, 0);
 }, []);
 
 return (
	<>
	 <section id="hero" className="noisy relative overflow-hidden flex items-center justify-center">
		{/* 背景视频 — 融入而非割裂 */}
		<video
		 ref={videoRef}
		 muted
		 loop
		 playsInline
		 autoPlay
		 src="/videos/output.mp4"
		 className="absolute inset-0 w-full h-full object-cover opacity-30"
		/>
		
		{/* 居中：MUSAGENT 标题 + 副描述 */}
		<div className="relative z-10 text-center px-5">
			<h1 className="title">MUSAGENT</h1>
			<p className="hero-desc mt-4 md:mt-6 text-sm md:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed"
			   style={{ color: 'var(--text-secondary)' }}>
				七大专业 Agent 协同工作——从意图识别到文本润色，从情感分析到风格匹配。
				每一次创作都是一场跨越文学与艺术的智能协作。
			</p>
			<Link to="/cocktails" className="hero-desc inline-block mt-6 px-6 py-2.5 rounded-full border border-white/15 hover:border-yellow hover:text-yellow transition-colors text-sm">
				探索平台能力
			</Link>
		</div>
		
		{/* 右下角：黄色标语 */}
		<p className="hero-yellow-tag absolute bottom-8 md:bottom-12 right-5 md:right-10 z-10 text-right font-modern-negra text-xl md:text-3xl lg:text-4xl text-yellow max-w-sm md:max-w-md leading-tight">
			连接诗词、艺术 <br className="md:hidden" />与音乐的多智能体创作平台
		</p>
		
		<img
		 src="/images/hero-left-leaf.png"
		 alt="left-leaf"
		 className="left-leaf"
		/>
		<img
		 src="/images/hero-right-leaf.png"
		 alt="right-leaf"
		 className="right-leaf"
		/>
	 </section>
	</>
 );
};

export default Hero;