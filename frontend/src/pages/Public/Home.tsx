import { ArrowUpRight, Boxes, CreditCard, Gauge, LockKeyhole, UsersRound, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { icon: LockKeyhole, title: 'Auth that is already solved', description: 'Login, verification, password recovery, and protected routes ready for your product.' },
  { icon: UsersRound, title: 'Teams without the glue code', description: 'Organizations, roles, invitations, and shared workspaces built into the foundation.' },
  { icon: CreditCard, title: 'Billing that stays in sync', description: 'Plans, checkout, subscriptions, and entitlements with the backend in charge.' },
  { icon: Gauge, title: 'A dashboard worth shipping', description: 'A clean product surface with settings, activity, and the room to grow.' },
];

export default function Home() {
  return <div>
    <section className="relative overflow-hidden border-b border-white/10 px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-32">
      <div className="public-container grid items-end gap-14 lg:grid-cols-[1.2fr_.8fr]">
        <div className="max-w-3xl">
          <p className="public-kicker mb-7 flex items-center gap-3"><span className="h-px w-8 bg-[#d7f36b]" /> SaaS infrastructure, focused</p>
          <h1 className="max-w-4xl text-5xl font-black leading-[.95] tracking-[-.07em] text-white sm:text-7xl lg:text-8xl">Start with the product.<br /><span className="text-[#d7f36b]">Skip the scaffolding.</span></h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300">LaunchStack gives ambitious teams the secure, production-ready base they need to turn an idea into a real SaaS business.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/register" className="public-button public-button--lime">Build your first release <ArrowUpRight className="h-4 w-4" /></Link><Link to="/pricing" className="public-button public-button--quiet">See the plans</Link></div>
        </div>
        <div className="public-panel relative min-h-[22rem] overflow-hidden p-6 sm:p-8">
          <div className="absolute right-6 top-6 text-right"><p className="public-kicker">Release 01</p><p className="mt-2 text-xs text-slate-500">foundation / active</p></div>
          <div className="absolute bottom-7 left-7 right-7"><div className="mb-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-2 w-2 bg-[#d7f36b]" /> Everything your first customer sees</div><div className="grid grid-cols-3 gap-px bg-white/10"><div className="bg-[#121614] p-3"><Boxes className="mb-7 h-4 w-4 text-[#d7f36b]" /><span className="text-xs text-slate-400">Workspace</span></div><div className="bg-[#121614] p-3"><Workflow className="mb-7 h-4 w-4 text-[#d7f36b]" /><span className="text-xs text-slate-400">Billing</span></div><div className="bg-[#121614] p-3"><Gauge className="mb-7 h-4 w-4 text-[#d7f36b]" /><span className="text-xs text-slate-400">Control</span></div></div></div>
        </div>
      </div>
    </section>

    <section className="public-container px-5 py-20 sm:px-8 sm:py-28"><div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]"><div><p className="public-kicker">The short version</p><h2 className="mt-5 text-4xl font-black tracking-[-.05em] text-white sm:text-5xl">Less setup.<br />More signal.</h2></div><div><p className="max-w-2xl text-xl leading-8 text-slate-300">Every hour spent rebuilding identity, billing, and workspace logic is an hour your product is not getting better. LaunchStack handles the repeatable parts with a stack you can understand and extend.</p><Link to="/about" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#d7f36b] hover:text-white">Why we built it <ArrowUpRight className="h-4 w-4" /></Link></div></div></section>

    <section className="border-y border-white/10 px-5 py-20 sm:px-8 sm:py-28"><div className="public-container"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="public-kicker">Included from day one</p><h2 className="mt-4 text-4xl font-black tracking-[-.05em] text-white sm:text-5xl">The boring parts.<br />Done properly.</h2></div><p className="max-w-xs text-sm leading-6 text-slate-400">A deliberate starting point for teams who want to move quickly without taking shortcuts.</p></div><div className="mt-14 grid border-l border-t border-white/10 sm:grid-cols-2">{features.map(({ icon: Icon, title, description }, index) => <article key={title} className="border-b border-r border-white/10 p-6 sm:p-8"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-[#d7f36b]" /><span className="public-outline-number text-3xl font-black">0{index + 1}</span></div><h3 className="mt-12 text-xl font-bold text-white">{title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{description}</p></article>)}</div></div></section>

    <section className="public-container px-5 py-20 sm:px-8 sm:py-28"><div className="flex flex-col items-start justify-between gap-8 border-b border-white/10 pb-14 sm:flex-row sm:items-end"><div><p className="public-kicker">Your next release</p><h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-.06em] text-white sm:text-6xl">Make the first version feel like the real one.</h2></div><Link to="/register" className="public-button public-button--lime">Get started free <ArrowUpRight className="h-4 w-4" /></Link></div></section>
  </div>;
}
