import { Link, useLocation } from 'react-router-dom'

const navRoutes = [
 { path: '/', label: '首页' },
 { path: '/cocktails', label: '灵感生成' },
 { path: '/menu', label: '知识库' },
 { path: '/about', label: 'Agent 工作流' },
 { path: '/contact', label: '创作润色' },
];

const Navbar = () => {
 const location = useLocation();
 
 return (
	<nav>
	 <div>
		<Link to="/" className="flex items-center gap-2">
		 <img src="/images/logo.png" alt="logo" />
		 <p>MusAgent</p>
		</Link>
		
		<ul>
		 {navRoutes.map((route) => (
			<li key={route.path}>
			 <Link
			  to={route.path}
			  className={`transition-colors hover:text-yellow ${
			   location.pathname === route.path
			    ? 'text-yellow'
			    : ''
			  }`}
			 >
			  {route.label}
			 </Link>
			</li>
		 ))}
		</ul>
	 </div>
	</nav>
 )
}
export default Navbar
