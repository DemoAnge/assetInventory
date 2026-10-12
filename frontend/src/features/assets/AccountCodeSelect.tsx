import { useQuery } from "@tanstack/react-query";
import { assetsApi } from "@/api/assetsApi";
import type { AccountCodeType } from "@/@types/asset.types";

export function AccountCodeSelect({
  value, onChange, onAutoFill,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  onAutoFill?: (ac: AccountCodeType | null) => void;
}) {
  const { data } = useQuery({
    queryKey: ["account-codes-select"],
    queryFn:  () => assetsApi.getAccountCodes({ is_active: true, page_size: 200 }).then(r => r.data.results),
    staleTime: 60_000,
  });
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null;
    onChange(id);
    if (onAutoFill) {
      const ac = id ? (data?.find(x => x.id === id) ?? null) : null;
      onAutoFill(ac);
    }
  };
  return (
    <select className="input-field" value={value ?? ""} onChange={handleChange}>
      <option value="">— Sin cuenta —</option>
      {data?.map(ac => (
        <option key={ac.id} value={ac.id}>{ac.code} — {ac.name}</option>
      ))}
    </select>
  );
}
