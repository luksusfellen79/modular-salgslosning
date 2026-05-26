import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { OfferProduct, OfferPackage } from '@/data/offerHubData';
import { cn } from '@/lib/utils';

interface OfferProductCardProps {
  product: OfferProduct;
  isSelected: boolean;
  onToggle: () => void;
  pointsAvailable?: number;
}

const categoryLabels: Record<string, string> = {
  broadband: 'Bredbånd', tv: 'TV', streaming: 'Strømming', security: 'Sikkerhet', hardware: 'Utstyr',
};

export const OfferProductCard: React.FC<OfferProductCardProps> = ({ product, isSelected, onToggle, pointsAvailable }) => {
  const canAfford = pointsAvailable === undefined || isSelected || pointsAvailable >= product.points;

  return (
    <button
      onClick={onToggle}
      disabled={!canAfford && !isSelected}
      className={cn(
        'offer-product-card w-full text-left p-4 transition-all duration-200 cursor-pointer rounded-xl border bg-card',
        isSelected ? 'border-primary bg-primary/5 border-2' : 'border-border hover:border-primary/40',
        !canAfford && !isSelected && 'opacity-40 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{product.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm text-foreground truncate">{product.name}</span>
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {product.points > 0 ? `${product.points}p` : 'Inkl.'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
          <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {categoryLabels[product.category]}
          </span>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        {isSelected ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground/40" />}
      </div>
    </button>
  );
};

interface OfferPackageCardProps {
  pkg: OfferPackage;
  isSelected: boolean;
  onSelect: () => void;
}

export const OfferPackageCard: React.FC<OfferPackageCardProps> = ({ pkg, isSelected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-5 transition-all duration-200 rounded-xl border bg-card hover:shadow-md',
        isSelected ? 'border-2 border-primary bg-primary/5' : 'border-border',
        pkg.featured && !isSelected && 'border-2 border-foreground/20'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm text-foreground">{pkg.name}</span>
        {pkg.featured && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-foreground text-background">
            Mest populær
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold text-foreground">{pkg.monthlyPrice}</span>
        <span className="text-sm text-muted-foreground">kr/mnd</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{pkg.description}</p>
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-full text-sm font-bold text-primary-foreground"
          style={{ background: pkg.color, width: 40, height: 40 }}
        >
          {pkg.totalPoints}
        </div>
        <span className="text-xs text-muted-foreground">poeng per beboer</span>
      </div>
      {isSelected && (
        <div className="flex items-center gap-1.5 mt-3 text-primary font-medium text-sm">
          <CheckCircle2 className="w-4 h-4" /> Valgt
        </div>
      )}
    </button>
  );
};
