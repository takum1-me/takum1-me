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
        <li>twitter</li>
        <li>instagram</li>
        <li>github</li>
      </ul>
    </main>
  );
}
