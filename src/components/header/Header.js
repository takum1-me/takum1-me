import Link from 'next/link';
import '../../styles/global.css';

const Header = () => {
    return (
        <header>
            <h1>takum1.me</h1>

            <nav>
                <ul>
                    <li>
                        <Link href="/">
                            <a>Home</a>
                        </Link>
                    </li>
                    <li>
                        <Link href="/about">
                            <a>Profile</a>
                        </Link>
                    </li>
                    <li>
                        <Link href="/projects">
                            <a>Blog</a>
                        </Link>
                    </li>
                    <li>
                        <Link href="/contact">
                            <a>Works</a>
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;