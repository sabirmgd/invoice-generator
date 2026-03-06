import { Profile } from '@/lib/types';

interface ProfileListProps {
  profiles: Profile[];
}

export function ProfileList({ profiles }: ProfileListProps) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/30 p-8 text-center">
        <p className="text-sm text-text-secondary">No profiles created yet.</p>
        <p className="mt-1 text-xs text-text-secondary">
          Create a sender profile to get started, or let Invo create one for you via chat.
        </p>
      </div>
    );
  }

  const grouped = {
    sender: profiles.filter((p) => p.type === 'sender'),
    client: profiles.filter((p) => p.type === 'client'),
    bank: profiles.filter((p) => p.type === 'bank'),
  };

  return (
    <div className="space-y-6">
      {(Object.entries(grouped) as [string, Profile[]][]).map(([type, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={type}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {type} profiles ({items.length})
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((profile) => (
                <div key={profile.id} className="rounded-xl border border-border bg-surface/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-semibold text-foreground">{profile.name}</h5>
                    {profile.isDefault && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600 border border-green-200">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs text-text-secondary">
                    {profile.companyName && <p>{profile.companyName}</p>}
                    {profile.email && <p>{profile.email}</p>}
                    {profile.phone && <p>{profile.phone}</p>}
                    {profile.bankName && <p>Bank: {profile.bankName}</p>}
                    {profile.iban && <p>IBAN: {profile.iban}</p>}
                    {profile.city && <p>{[profile.city, profile.country].filter(Boolean).join(', ')}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
