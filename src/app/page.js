import Image from 'next/image';

export default function Home() {
  return (
    <main>

      <h1>ひっそりと、大胆に。</h1>
      <p>自分がつくりたかったものを、こっそりと貯めていく場所。</p>
      <Image
        src="/daidai-toppage.JPG"
        alt="トップページのだいだいの画像"
        width={1500}
        height={1000} />

      <div>accounts</div>
      <ul>
        <li><a href='https://twitter.com/takum1_me'>twitter</a></li>
        <li><a href='https://www.instagram.com/taku_mi_k/'>instagram</a></li>
        <li><a href='https://github.com/takum1-me'>github</a></li>
      </ul>
    </main>
  );
}
