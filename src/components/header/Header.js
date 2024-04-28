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
                        <Link href="/Profile">
                            <a>Profile</a>
                        </Link>
                    </li>
                    <li>
                        <Link href="/Works">
                            <a>Works</a>
                        </Link>
                    </li>
                    <li>
                        <Link href="/Blog">
                            <a>Blog</a>
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;