import Image from "next/image";

export default function Logo() {
    return (
        <Image src="/logo_dark_theme.svg" alt="Admyral Logo" width={120}
        height={20} />
    );
}