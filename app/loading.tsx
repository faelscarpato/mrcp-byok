import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="animate-pulse">
        <Image
          src="/icons/mrcp-icon.svg"
          alt="MRCP Web Terminal"
          width={150}
          height={150}
          priority
        />
      </div>
    </div>
  );
}
