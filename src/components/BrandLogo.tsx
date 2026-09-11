import { cn } from '@/lib/utils';

/** Original company artwork, preserved without recoloring or cropping. */
export default function BrandLogo({ className }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}DELACASAPNG.png`} alt="DELACASA · Lácteos de Acoyapa S.A." className={cn('block shrink-0 object-contain', className)} />;
}
