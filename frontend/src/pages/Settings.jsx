import { Cloud, Database, KeyRound, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/PageHeader.jsx';

const settings = [
  { title: 'API base URL', value: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', icon: Database },
  { title: 'Authentication', value: 'JWT bearer tokens with role permissions', icon: KeyRound },
  { title: 'File storage', value: 'Cloudinary receipt uploads', icon: Cloud },
  { title: 'Security', value: 'Helmet, rate limits, bcrypt, validation, protected routes', icon: ShieldCheck }
];

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" description="Environment and security configuration overview." />
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon size={21} />
                </div>
                <div>
                  <h2 className="font-bold">{item.title}</h2>
                  <p className="mt-1 text-sm text-stone-500">{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
