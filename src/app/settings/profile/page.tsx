import { redirect } from 'next/navigation';

export default async function SettingsProfilePage() {
    redirect('/bazi#settings/profile');
}