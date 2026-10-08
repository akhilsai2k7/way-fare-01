import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { CarpoolProvider, useCarpool } from '@/lib/carpool-context';
import { requireSupabase } from '@/lib/supabase/client';
import {
  ArrowDownUp, ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check,
  CircleHelp, Clock3, Compass, CreditCard, Gauge, HeartHandshake, MailCheck,
  CarFront, Inbox, Leaf, LogOut, Mail, MapPin, Menu, MessageCircle, MoreHorizontal, Navigation, Phone, Smartphone,
  Plus, Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Star,
  Users, RefreshCw, X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
const navItems = [
  { label: 'Overview', href: '/dashboard', icon: Gauge },
  { label: 'Find a ride', href: '/find-ride', icon: Compass },
  { label: 'Offer a ride', href: '/offer-ride', icon: Plus },
  { label: 'My rides', href: '/my-rides', icon: Navigation },
  { label: 'Requests', href: '/requests', icon: Inbox },
  { label: 'Messages', href: '/messages', icon: MessageCircle },
  { label: 'Notifications', href: '/notifications', icon: Bell },
];
const initials = (name = 'Commuter') => name.split(' ').map((word: string) => word[0]).slice(0, 2).join('').toUpperCase();
const dateLabel = (date: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Flexible';

function AppFrame({ children, data }: { children: ReactNode; data: any }) {
  const [path, navigate] = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const profile = data.profile || data.user || {};
  const displayName = profile.fullName || profile.name || profile.email?.split('@')[0] || 'Your account';
  const demo = data.backendMode === 'demo' || !data.isBackendConfigured;
  return <div className="app-frame">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <Link href="/" className="brand" onClick={() => setMobileMenu(false)}><span className="brand-mark"><ArrowDownUp size={18}/></span><span>wayfare<span className="brand-period">.</span></span></Link>
      <div className="workspace-label">YOUR COMMUTE</div>
      <nav aria-label="Main navigation" className="side-nav">{navItems.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileMenu(false)} className={`side-link ${path === href ? 'active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={18}/><span>{label}</span>{label === 'Notifications' && data.notifications?.some((n: any) => !n.read) && <i className="nav-dot"/>}</Link>)}</nav>
      <div className="side-bottom">
        <div className="safe-card"><div className="safe-icon"><ShieldCheck size={17}/></div><strong>Good rides start with trust.</strong><p>Profiles are built around real people, not anonymous listings.</p><Link href="/profile">Your trust profile <ArrowRight size={13}/></Link></div>
        <Link href="/settings" className={`side-link ${path === '/settings' ? 'active' : ''}`}><Settings size={18}/><span>Settings</span></Link>
        <button className="account-chip" onClick={() => navigate('/profile')} data-testid="button-open-profile"><span className="avatar avatar-small">{initials(displayName)}</span><span className="account-copy"><b>{displayName}</b><small>Personal account</small></span><MoreHorizontal size={18}/></button>
      </div>
    </aside>
    {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)}/>}
    <main className="main-panel">
      <header className="topbar">
        <button className="icon-button menu-toggle" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={20}/></button>
        <div className="breadcrumb"><span>Wayfare</span><span className="crumb-divider">/</span><b>{navItems.find(n => n.href === path)?.label || (path === '/' ? 'Home' : path.slice(1).replaceAll('-', ' '))}</b></div>
        <div className="topbar-right"><span className={`mode-pill ${demo ? 'mode-demo' : 'mode-live'}`}><i/>{demo ? 'Demo mode' : 'Live mode'}</span><Link href="/notifications" className="icon-button top-notice" aria-label="Notifications"><Bell size={18}/>{data.notifications?.some((n: any) => !n.read) && <i/>}</Link><Link href="/profile" className="top-avatar">{initials(displayName)}</Link></div>
      </header>
      <div className="page-content">{children}</div>
    </main>
    <div className="mobile-bottom">{navItems.slice(0, 4).map(({label, href, icon: Icon}) => <Link key={href} href={href} className={path === href ? 'selected' : ''}><Icon size={19}/><span>{label === 'Overview' ? 'Home' : label === 'Find a ride' ? 'Find' : label === 'Offer a ride' ? 'Offer' : 'Rides'}</span></Link>)}</div>
  </div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
}
function Button({ children, variant = 'primary', className = '', ...props }: any) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
function Avatar({ name, className = '' }: { name: string; className?: string }) { return <span className={`avatar ${className}`}>{initials(name)}</span>; }
function Stat({ number, label, icon: Icon }: any) { return <div className="stat-cell"><span className="stat-icon"><Icon size={17}/></span><div><strong>{number}</strong><small>{label}</small></div></div>; }
function Status({ value }: { value: string }) { const label = String(value || 'OPEN').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); return <span className={`status status-${String(value || 'open').toLowerCase()}`}>{label}</span>; }
function EmptyState({ title, text, link, label }: { title: string; text: string; link?: string; label?: string }) { return <div className="empty-state"><div className="empty-mark"><Navigation size={22}/></div><h3>{title}</h3><p>{text}</p>{link && <Link href={link} className="button button-primary">{label || 'Explore rides'} <ArrowRight size={15}/></Link>}</div>; }

function RideCard({ ride, onRequest, index = 0, requested = false }: any) {
  return <article className="ride-card" style={{ animationDelay: `${index * 70}ms` }} data-testid={`card-ride-${ride.id}`}>
    <div className="ride-card-top"><div className="driver"><Avatar name={ride.driverName || 'Local driver'}/><div><strong>{ride.driverName || 'Local driver'}</strong><span className="driver-meta"><Star size={12} fill="currentColor"/> {ride.driverRating ?? ride.rating ?? 'New'} <span>·</span> community member</span></div></div><div className="price"><strong>{formatCurrency(ride.price)}</strong><span>per seat</span></div></div>
    <div className="route-line"><div className="route-stops"><span className="route-dot"/><strong>{ride.origin}</strong><span className="route-dash"/><span className="route-destination"/><strong>{ride.destination}</strong></div><div className="route-time"><span>{ride.departureTime || '8:15 AM'}</span><span>{ride.estimatedArrivalTime || '9:05 AM'}</span></div></div>
    <div className="ride-card-foot"><span><CalendarDays size={15}/>{dateLabel(ride.departureDate)}</span><span><Users size={15}/>{ride.availableSeats} seats left</span><span><Navigation size={15}/>{ride.maxDetourKm ?? 5} km detour</span><div className="ride-actions">{ride.matchScore !== undefined && <span className="match-score"><Sparkles size={13}/>{ride.matchScore}% match</span>}<Link href={`/rides/${ride.id}`} className="text-link">Details <ArrowUpRight size={14}/></Link></div></div>
    {onRequest && <div className="ride-card-mobile-action"><Button disabled={requested} onClick={() => onRequest(ride.id)}>{requested ? 'Requested' : 'Request a seat'}</Button></div>}
  </article>;
}

function HomePage({ data }: { data: any }) {
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [, navigate] = useLocation();
  const submit = (e: FormEvent) => { e.preventDefault(); navigate(`/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`); };
  const rides = (data.rides || []).slice(0, 2);
  return <div className="home-page">
    <section className="home-hero">
      <div className="hero-copy"><div className="eyebrow eyebrow-light"><span/> THE COMMUTE, SHARED</div><h1>Better together.<br/><em>There and back.</em></h1><p>Find the familiar faces heading your way. Share the drive, split the cost, make the miles feel shorter.</p><form className="hero-search" onSubmit={submit}><label><MapPin size={18}/><span className="sr-only">Leaving from</span><input value={from} onChange={e=>setFrom(e.target.value)} placeholder="Leaving from" aria-label="Leaving from" required/></label><span className="search-divider"><ArrowDownUp size={15}/></span><label><Navigation size={18}/><span className="sr-only">Going to</span><input value={to} onChange={e=>setTo(e.target.value)} placeholder="Going to" aria-label="Going to" required/></label><button type="submit" aria-label="Search rides"><Search size={18}/><span>Find a ride</span></button></form><div className="hero-trust"><ShieldCheck size={16}/><span>Clear profiles. Clear prices. No awkward surprises.</span></div></div>
      <div className="hero-art" aria-label="A shared commute route illustration"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-sun"/><div className="art-road"><span className="road-dash"/></div><div className="art-pin pin-a"><MapPin size={19}/></div><div className="art-pin pin-b"><Navigation size={18}/></div><div className="art-car"><div className="car-window"/><div className="wheel wheel-one"/><div className="wheel wheel-two"/></div><div className="art-label label-start">Your neighborhood</div><div className="art-label label-end">The same way</div><div className="art-person person-a">JM</div><div className="art-person person-b">AK</div></div>
      <div className="hero-bottom"><span>One seat can change the whole trip.</span><Link href="/find-ride">See how it works <ArrowRight size={15}/></Link></div>
    </section>
    <section className="home-body"><div className="section-title-row"><div><div className="eyebrow">A GOOD WAY TO GO</div><h2>Shared miles, <em>better days.</em></h2></div><Link href="/find-ride" className="text-link">Explore all rides <ArrowRight size={15}/></Link></div>
      <div className="home-feature-grid"><div className="feature-card feature-trust"><div className="feature-icon"><HeartHandshake size={20}/></div><h3>People, not profiles.</h3><p>See who you’re riding with before you share a mile. Ratings come from real rides, not anonymous stars.</p><span className="feature-foot">COMMUNITY FIRST <ShieldCheck size={14}/></span></div><div className="feature-card feature-savings"><div className="feature-icon"><CreditCard size={20}/></div><h3>Good for your wallet.</h3><p>Split fuel and tolls with people already headed your way. A little less solo, a lot less spend.</p><span className="feature-foot">COSTS, SHARED FAIRLY <ArrowUpRight size={14}/></span></div><div className="feature-card feature-planet"><div className="feature-icon"><Leaf size={20}/></div><h3>One less car alone.</h3><p>Small changes to the everyday route add up. Better traffic, cleaner air, and someone to talk to.</p><span className="feature-foot">THE LONG VIEW <span className="tiny-leaf">+</span></span></div></div>
      <div className="upcoming-heading"><div><div className="eyebrow">AROUND YOUR ROUTE</div><h2>Rides worth sharing</h2></div><Link href="/find-ride" className="text-link">All nearby <ArrowRight size={15}/></Link></div>
      {data.loading ? <div className="skeleton-list"><div/><div/></div> : rides.length ? <div className="ride-list">{rides.map((ride:any,i:number)=><RideCard key={ride.id} ride={ride} index={i}/>)}</div> : <div className="quiet-empty"><Compass size={19}/><span>Once rides are posted, the best nearby matches will show up here.</span><Link href="/offer-ride">Offer the first ride <ArrowRight size={14}/></Link></div>}
      <div className="commute-note"><div className="note-quote">“A shared ride is time back in your day—and someone new to look forward to seeing.”</div><div className="note-person"><span className="avatar avatar-small"><HeartHandshake size={15}/></span><span><strong>A better commute</strong><small>Made for the people along your route</small></span></div></div>
    </section>
    <footer className="home-footer"><span>wayfare<span className="brand-period">.</span></span><span>A more human way to get there.</span><Link href="/auth">Join the commute <ArrowRight size={14}/></Link></footer>
  </div>;
}

function FindRides({ data }: {data:any}) {
  const [,navigate]=useLocation();
  const params=new URLSearchParams(window.location.search);
  const [from,setFrom]=useState(params.get('from')||''); const [to,setTo]=useState(params.get('to')||''); const [date,setDate]=useState(''); const [seats,setSeats]=useState('1');
  const [maxPrice,setMaxPrice]=useState(''); const [maxDetourKm,setMaxDetourKm]=useState(''); const [vehicleType,setVehicleType]=useState('');
  const [requestedIds,setRequestedIds]=useState<string[]>([]);
  const [results,setResults]=useState<any[]|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const search=async(e?:FormEvent)=>{ e?.preventDefault(); setBusy(true);setError('');try{const result=await data.searchRides({origin:from.trim()||undefined,destination:to.trim()||undefined,departureDate:date||undefined,seats:Number(seats),maxPrice:maxPrice===''?undefined:Number(maxPrice),maxDetourKm:maxDetourKm===''?undefined:Number(maxDetourKm),vehicleType:vehicleType||undefined});setResults(result || []);}catch(err:any){setError(err?.message||'We couldn’t load rides right now. Try again.');}finally{setBusy(false);} };
   useEffect(()=>{if(!data.loading) void search();},[data.loading,data.blockedUserIds,data.user?.id]);
  const rides=results ?? data.rides ?? [];
   const request=async(id:string)=>{if(!data.user){navigate('/auth');return;}try{await data.requestRide(id,1,'Hi, I’d love to join this commute.');setRequestedIds((ids)=>[...ids,id]);setError('Seat request sent. The driver will see your note.');await search();}catch(e:any){setError(e?.message||'Unable to request this seat.');}};
  const clearFilters=()=>{setFrom('');setTo('');setDate('');setSeats('1');setMaxPrice('');setMaxDetourKm('');setVehicleType('');setBusy(true);setError('');void data.searchRides({seats:1}).then((result:any)=>setResults(result||[])).catch((err:any)=>setError(err?.message||'We couldn’t load rides right now.')).finally(()=>setBusy(false));};
  return <><PageHeading eyebrow="FIND YOUR WAY" title="Find a ride" detail="A familiar route is better with good company."/><form className="filter-panel" onSubmit={search}><label className="field-wrap"><span>FROM</span><div><MapPin size={16}/><input value={from} onChange={e=>setFrom(e.target.value)} placeholder="City or neighborhood"/></div></label><button type="button" className="swap-button" onClick={()=>{setFrom(to);setTo(from)}} aria-label="Swap locations"><ArrowDownUp size={16}/></button><label className="field-wrap"><span>TO</span><div><Navigation size={16}/><input value={to} onChange={e=>setTo(e.target.value)} placeholder="Where are you headed?"/></div></label><label className="field-wrap date-field"><span>WHEN</span><div><CalendarDays size={16}/><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div></label><label className="field-wrap seats-field"><span>SEATS</span><div><Users size={16}/><select value={seats} onChange={e=>setSeats(e.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option></select></div></label><label className="field-wrap"><span>MAX CONTRIBUTION</span><div><span>₹</span><input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Any"/></div></label><label className="field-wrap"><span>MAX DETOUR</span><div><Navigation size={16}/><input type="number" min="0" step="0.5" value={maxDetourKm} onChange={e=>setMaxDetourKm(e.target.value)} placeholder="Any"/><span>km</span></div></label><label className="field-wrap"><span>VEHICLE</span><div><select value={vehicleType} onChange={e=>setVehicleType(e.target.value)}><option value="">Any type</option><option>Car</option><option>Sedan</option><option>Hatchback</option><option>SUV</option></select></div></label><Button type="submit" disabled={busy}><Search size={16}/>{busy?'Searching':'Search rides'}</Button></form>
     <div className="results-head"><div><div className="eyebrow">GOOD MATCHES</div><h2>{results ? `${results.length} rides found` : `${rides.length} rides to explore`}</h2></div><button type="button" className="quiet-filter" onClick={clearFilters}><SlidersHorizontal size={15}/> Clear filters</button></div>
    {error&&<div className="inline-alert" role="alert">{error}<button onClick={()=>search()}>Try again</button></div>}
     {busy ? <div className="skeleton-list"><div/><div/><div/></div> : rides.length ? <div className="ride-list">{rides.map((r:any,i:number)=><RideCard key={r.id} ride={r} index={i} onRequest={request} requested={requestedIds.includes(r.id)}/>)}</div>:<EmptyState title="No rides on that route. Yet." text="Try a nearby neighborhood or post your own ride. The right person may be looking for the same thing." link="/offer-ride" label="Offer this route"/>}
  </>;
}

function OfferRide({data}:any){
  const [form,setForm]=useState({origin:'',destination:'',departureDate:'',departureTime:'08:15',estimatedArrivalTime:'09:00',availableSeats:'2',price:'12',maxDetourKm:'5',vehicle:'',notes:''});
  const [error,setError]=useState('');const [done,setDone]=useState(false);const [saving,setSaving]=useState(false);
  const change=(e:any)=>setForm({...form,[e.target.name]:e.target.value});
  const submit=async(e:FormEvent)=>{e.preventDefault();setError('');setSaving(true);try{await data.createRide({...form,availableSeats:Number(form.availableSeats),price:Number(form.price),maxDetourKm:Number(form.maxDetourKm),vehicle:{make:form.vehicle.trim(),model:'',vehicleType:'Car'}});setDone(true);}catch(err:any){setError(err?.message||'Your ride could not be posted. Please try again.');}finally{setSaving(false);}};
  return <><PageHeading eyebrow="MAKE ROOM" title="Offer a ride" detail="Your usual route could make somebody’s day a little easier."/>{!data.user&&<div className="inline-alert">Sign in to post a ride. <Link href="/auth">Go to sign in <ArrowRight size={14}/></Link></div>}
    {done?<div className="success-panel"><span className="success-check"><Check size={22}/></span><div><div className="eyebrow">ON THE ROAD</div><h2>Your ride is posted.</h2><p>We’ll let you know when someone requests a seat.</p></div><Link href="/my-rides" className="button button-primary">View my rides <ArrowRight size={15}/></Link></div>:
    <form className="form-card offer-form" onSubmit={submit}><div className="form-section"><div className="form-section-number">01</div><div className="form-section-body"><h3>The route</h3><p>Share where you’re starting and where you’re going.</p><div className="form-grid"><label className="input-field"><span>Starting point</span><input name="origin" value={form.origin} onChange={change} required placeholder="e.g. Indiranagar, Bengaluru"/></label><label className="input-field"><span>Destination</span><input name="destination" value={form.destination} onChange={change} required placeholder="e.g. Whitefield, Bengaluru"/></label></div></div></div><div className="form-section"><div className="form-section-number">02</div><div className="form-section-body"><h3>Departure details</h3><p>Enough detail to make planning feel easy.</p><div className="form-grid form-grid-three"><label className="input-field"><span>Date</span><input type="date" name="departureDate" value={form.departureDate} onChange={change} required/></label><label className="input-field"><span>Leave around</span><input type="time" name="departureTime" value={form.departureTime} onChange={change} required/></label><label className="input-field"><span>Arrive around</span><input type="time" name="estimatedArrivalTime" value={form.estimatedArrivalTime} onChange={change}/></label></div></div></div><div className="form-section"><div className="form-section-number">03</div><div className="form-section-body"><h3>Make it work for everyone</h3><p>Clear expectations make for a better ride.</p><div className="form-grid form-grid-three"><label className="input-field"><span>Open seats</span><select name="availableSeats" value={form.availableSeats} onChange={change}><option value="1">1 seat</option><option value="2">2 seats</option><option value="3">3 seats</option><option value="4">4 seats</option></select></label><label className="input-field"><span>Contribution per seat</span><div className="input-prefix"><span>₹</span><input type="number" min="0" name="price" value={form.price} onChange={change}/></div></label><label className="input-field"><span>Detour you can take</span><div className="input-suffix"><input type="number" min="0" step="0.5" name="maxDetourKm" value={form.maxDetourKm} onChange={change}/><span>km</span></div></label></div><div className="form-grid"><label className="input-field"><span>Your vehicle</span><input name="vehicle" value={form.vehicle} onChange={change} required placeholder="e.g. Honda City"/></label><label className="input-field"><span>A note for riders <small>Optional</small></span><input name="notes" value={form.notes} onChange={change} placeholder="Pickup details, music, luggage…"/></label></div></div></div>{error&&<div className="inline-alert" role="alert">{error}</div>}<div className="form-submit-row"><span><ShieldCheck size={16}/> Keep your profile and ride details current.</span><Button type="submit" disabled={saving||!data.user}>{saving?'Posting…':'Post this ride'} <ArrowRight size={16}/></Button></div></form>}</>;
}

function RideDetail({data}:any){
 const {id}=useParams();const [,navigate]=useLocation();
 const [ride,setRide]=useState<any>(()=>data.rides?.find((r:any)=>String(r.id)===id)||null);
 const [rideLoading,setRideLoading]=useState(true);
 const [message,setMessage]=useState('Hi, I’d love to join this commute.');const [seats,setSeats]=useState('1');const [err,setErr]=useState('');const [sent,setSent]=useState(false);
 useEffect(()=>{let active=true;const cached=data.rides?.find((r:any)=>String(r.id)===id);if(cached){setRide(cached);setRideLoading(false);return()=>{active=false;};}setRide(null);setRideLoading(true);void data.getRide(id).then((found:any)=>{if(active)setRide(found);}).catch((e:any)=>{if(active)setErr(e?.message||'We could not load this ride.');}).finally(()=>{if(active)setRideLoading(false);});return()=>{active=false;};},[id,data.rides,data.getRide]);
  if(data.loading||rideLoading)return <div className="skeleton-list"><div/><div/></div>;
 if(!ride)return <EmptyState title="This ride has moved on." text="It may have been filled or taken down. There are plenty of other routes to explore." link="/find-ride"/>;
  const request=async()=>{if(!data.user){navigate('/auth');return;}try{await data.requestRide(ride.id,Number(seats),message);setSent(true);}catch(e:any){setErr(e?.message||'Request could not be sent.');}};
  const report=async()=>{const reason=window.prompt('What should our community team know?');if(!reason)return;try{await data.reportUser({reportedUserId:ride.driverId,rideId:ride.id,reason});setErr('Thanks. Our community team will review your report.');}catch(e:any){setErr(e?.message||'Your report could not be sent.');}};
  const block=async()=>{if(!window.confirm(`Block ${ride.driverName}? You will no longer see their rides.`))return;try{await data.blockUser(ride.driverId);setErr('This commuter is blocked. Their rides will no longer appear in search.');}catch(e:any){setErr(e?.message||'This commuter could not be blocked.');}};
 return <>
  <Link href="/find-ride" className="back-link"><ArrowRight size={15}/> Back to rides</Link>
  <div className="detail-layout">
   <div>
    <div className="detail-route-hero"><div className="eyebrow">A COMMUTE TO SHARE</div><div className="detail-route"><span><i className="route-dot"/>{ride.origin}</span><div className="route-draw"/><span><i className="route-destination"/>{ride.destination}</span></div><div className="detail-chips"><span><CalendarDays size={15}/>{dateLabel(ride.departureDate)}</span><span><Clock3 size={15}/>{ride.departureTime} – {ride.estimatedArrivalTime||'Arrival time flexible'}</span></div></div>
    <div className="detail-info"><h2>About this ride</h2><p>{ride.notes||'A relaxed, straightforward commute. Let’s make the trip a little better by sharing it.'}</p><div className="detail-specs"><span><Users size={17}/><b>{ride.availableSeats}</b> seats available</span><span><Navigation size={17}/><b>{ride.maxDetourKm} km</b> detour flexibility</span><span><CarFront size={17}/>{ride.vehicle?.color?`${ride.vehicle.color} `:''}{ride.vehicle?.make} {ride.vehicle?.model}</span></div></div>
    <div className="detail-driver"><Avatar name={ride.driverName}/><div className="driver-info"><span>YOUR DRIVER</span><strong>{ride.driverName}</strong><small><Star size={13} fill="currentColor"/>{ride.driverRating??'No ratings yet'} · community member</small></div></div>
    <button className="report-link" onClick={report}><ShieldCheck size={14}/> Report a safety concern</button><button className="report-link" onClick={block}>Block this commuter</button>{err&&<div className="inline-alert">{err}</div>}
   </div>
   <aside className="request-card"><div className="eyebrow">YOUR SHARE</div><div className="request-price">{formatCurrency(ride.price)}<small> / seat</small></div><p>Fuel and toll contribution, shared fairly.</p>{sent?<div className="success-message"><Check size={17}/>Request sent. You’ll hear when the driver responds.</div>:<><label className="input-field"><span>Seats requested</span><select value={seats} onChange={e=>setSeats(e.target.value)}>{Array.from({length:Math.min(ride.availableSeats,4)},(_,index)=><option value={index+1} key={index+1}>{index+1} {index===0?'seat':'seats'}</option>)}</select></label><label className="input-field"><span>Message to the driver</span><textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4}/></label>{err&&<div className="inline-alert">{err}</div>}<Button onClick={request} disabled={!data.user||ride.driverId===data.user.id||ride.status!=='SCHEDULED'||ride.availableSeats<1} className="full-width">Request a seat <ArrowRight size={15}/></Button></>}<div className="request-safety"><ShieldCheck size={15}/> A request reserves no seat; the driver confirms it.</div></aside>
  </div>
 </>;
}

function Dashboard({data}:any){
 const profile=data.profile||{};const userRides=(data.rides||[]).filter((r:any)=>r.driverId===data.user?.id);const pending=(data.requests||[]).filter((r:any)=>r.status==='PENDING');
 return <><PageHeading eyebrow="YOUR WAYFARE" title={`Good morning${profile.fullName?`, ${profile.fullName.split(' ')[0]}`:''}.`} detail="Here’s what’s happening with your commute." action={<Link href="/offer-ride" className="button button-primary"><Plus size={16}/> Offer a ride</Link>}/><div className="stats-strip"><Stat number={data.rides?.length||0} label="rides nearby" icon={Navigation}/><Stat number={pending.length} label="requests to review" icon={Inbox}/><Stat number={profile.rating||'—'} label="community rating" icon={Star}/></div><div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">NEXT UP</div><h2>Your upcoming rides</h2></div><Link href="/my-rides" className="text-link">All rides <ArrowRight size={14}/></Link></div>{userRides.length?<div className="ride-list compact">{userRides.slice(0,2).map((ride:any,i:number)=><RideCard key={ride.id} ride={ride} index={i}/>)}</div>:<div className="compact-empty"><div className="empty-mark"><Navigation size={20}/></div><strong>No rides on your calendar.</strong><p>Find your usual route or offer a seat in yours.</p><div className="empty-actions"><Link href="/find-ride">Find a ride</Link><Link href="/offer-ride">Offer one <ArrowRight size={14}/></Link></div></div>}</section><section className="panel activity-panel"><div className="panel-heading"><div><div className="eyebrow">IN THE LOOP</div><h2>Recent updates</h2></div><Link href="/notifications" className="text-link">All updates <ArrowRight size={14}/></Link></div>{data.notifications?.length?<div className="activity-list">{data.notifications.slice(0,4).map((n:any)=><div key={n.id} className="activity-item"><span className="activity-icon"><Bell size={16}/></span><div><strong>{n.title}</strong><p>{n.message}</p><small>{n.createdAt?new Date(n.createdAt).toLocaleDateString():'Just now'}</small></div></div>)}</div>:<div className="activity-empty"><Sparkles size={20}/><p>It’s quiet for now. We’ll keep you posted when something moves.</p></div>}</section></div><section className="route-prompt"><div><span className="eyebrow">BETTER TOGETHER</span><h2>Know someone heading the same way?</h2><p>Invite your regular carpool crew to join you on Wayfare.</p></div><Link href="/find-ride" className="button button-dark">Find your people <ArrowRight size={15}/></Link></section></>;
}
function MyRides({data}:any){const [error,setError]=useState('');const driverRides=(data.rides||[]).filter((r:any)=>r.driverId===data.user?.id);const passengerRides=(data.requests||[]).filter((q:any)=>q.passengerId===data.user?.id&&q.status==='ACCEPTED').map((q:any)=>data.rides?.find((r:any)=>r.id===q.rideId)).filter(Boolean);const rides=[...new Map([...driverRides,...passengerRides].map((r:any)=>[r.id,r])).values()];const complete=async(id:string)=>{try{await data.completeRide(id);}catch(e:any){setError(e.message||'This ride could not be marked complete.');}};const cancel=async(id:string)=>{try{await data.cancelRide(id);}catch(e:any){setError(e.message||'This ride could not be cancelled.');}};return <><PageHeading eyebrow="YOUR COMMUTE" title="My rides" detail="Your offered rides and confirmed seats." action={<Link className="button button-primary" href="/offer-ride"><Plus size={16}/> Offer a ride</Link>}/>{error&&<div className="inline-alert">{error}</div>}{data.loading?<div className="skeleton-list"><div/><div/></div>:rides.length?<div className="ride-list">{rides.map((r:any,i:number)=><div key={r.id}><RideCard ride={r} index={i}/>{r.driverId===data.user?.id&&['SCHEDULED','IN_PROGRESS'].includes(r.status)&&<div className="ride-actions"><button className="complete-ride" onClick={()=>complete(r.id)}><Check size={14}/> Mark ride complete</button><button className="complete-ride" onClick={()=>cancel(r.id)}>Cancel ride</button></div>}</div>)}</div>:<EmptyState title="Your route could help someone." text="Post the trip you already make. You set the seats, the price, and how far you’re willing to detour." link="/offer-ride" label="Offer a ride"/>}</>}
function Requests({data}:any){const [error,setError]=useState('');const [view,setView]=useState<'incoming'|'outgoing'>('incoming');const [ratings,setRatings]=useState<Record<string,string>>({});const all=data.requests||[];const incoming=all.filter((r:any)=>data.rides?.some((ride:any)=>ride.id===r.rideId&&ride.driverId===data.user?.id));const outgoing=all.filter((r:any)=>r.passengerId===data.user?.id);const shown=view==='incoming'?incoming:outgoing;const respond=async(id:string,status:'ACCEPTED'|'REJECTED')=>{try{await data.respondToRequest(id,status);}catch(e:any){setError(e.message||'We couldn’t update this request.');}};const cancel=async(id:string)=>{try{await data.cancelRequest(id);}catch(e:any){setError(e.message||'We couldn’t cancel that request.');}};const rate=async(r:any)=>{const ride=data.rides?.find((x:any)=>x.id===r.rideId);const reviewedUserId=view==='outgoing'?ride?.driverId:r.passengerId;try{await data.rateUser({rideId:r.rideId,reviewedUserId,rating:Number(ratings[r.id]||5)});setError('Thanks for helping make Wayfare more trustworthy.');}catch(e:any){setError(e.message||'Your rating could not be saved.');}};return <><PageHeading eyebrow="A SEAT AT YOUR TABLE" title="Ride requests" detail="People who’d like to share the drive."/><div className="request-tabs"><button className={view==='incoming'?'tab-active':''} onClick={()=>setView('incoming')}>For my rides <b>{incoming.filter((r:any)=>r.status==='PENDING').length}</b></button><button className={view==='outgoing'?'tab-active':''} onClick={()=>setView('outgoing')}>My requests <b>{outgoing.length}</b></button></div>{error&&<div className="inline-alert">{error}</div>}{shown.length?<div className="request-list">{shown.map((r:any)=><article key={r.id} className="request-row"><Avatar name={view==='incoming'?r.passengerName:(data.rides?.find((ride:any)=>ride.id===r.rideId)?.driverName||'Driver')}/><div className="request-person"><strong>{view==='incoming'?r.passengerName:(data.rides?.find((ride:any)=>ride.id===r.rideId)?.driverName||'Ride request')}</strong><small>Requesting {r.seatsRequested} {r.seatsRequested===1?'seat':'seats'} · {r.createdAt?new Date(r.createdAt).toLocaleDateString():'recently'}</small><p>{r.message||'Looking forward to sharing the commute.'}</p></div><div className="request-row-side"><Status value={r.status}/>{view==='incoming'&&r.status==='PENDING'&&<div className="request-row-actions"><Button variant="soft" onClick={()=>respond(r.id,'REJECTED')}>Pass</Button><Button onClick={()=>respond(r.id,'ACCEPTED')}>Accept <Check size={14}/></Button></div>}{view==='outgoing'&&r.status==='PENDING'&&<Button variant="soft" onClick={()=>cancel(r.id)}>Cancel</Button>}{r.status==='ACCEPTED'&&data.rides?.find((ride:any)=>ride.id===r.rideId)?.status==='COMPLETED'&&<div className="rating-action"><select aria-label="Choose a rating" value={ratings[r.id]||'5'} onChange={e=>setRatings({...ratings,[r.id]:e.target.value})}><option value="5">5 — Wonderful</option><option value="4">4 — Good</option><option value="3">3 — Fine</option><option value="2">2 — Not great</option><option value="1">1 — Poor</option></select><button onClick={()=>rate(r)}><Star size={13}/> Rate {view==='outgoing'?'driver':'rider'}</button></div>}</div></article>)}</div>:<EmptyState title={view==='incoming'?'No requests just yet.':'No requests sent yet.'} text={view==='incoming'?'When someone asks to join your ride, you’ll find their note here. No pressure, just a chance to connect.':'Find a ride that fits your route and send a short note to the driver.'} link={view==='incoming'?'/offer-ride':'/find-ride'} label={view==='incoming'?'Offer a ride':'Find a ride'}/>}</>}

function Messages({data}:any){const [active,setActive]=useState(data.conversations?.[0]?.id);const [text,setText]=useState('');const [err,setErr]=useState('');const conversation=data.conversations?.find((c:any)=>c.id===active);const chatMessages=(data.messages||[]).filter((m:any)=>m.conversationId===active);const send=async(e:FormEvent)=>{e.preventDefault();if(!text.trim())return;try{await data.sendMessage(active,text.trim());setText('');setErr('');}catch(e:any){setErr(e?.message||'Message could not be sent.');}};
 return <><PageHeading eyebrow="STAY IN TOUCH" title="Messages" detail="Sort the pickup details, then enjoy the ride."/><div className="messages-layout"><aside className="conversation-list"><div className="conversation-search"><Search size={16}/><input placeholder="Search conversations" aria-label="Search conversations"/></div>{data.conversations?.map((c:any)=><button key={c.id} onClick={()=>setActive(c.id)} className={`conversation-item ${active===c.id?'current':''}`}><Avatar name={c.participantName}/><span><strong>{c.participantName}</strong><small>{c.lastMessage||'Start the conversation'}</small></span><small className="convo-time">Today</small></button>)}{!data.conversations?.length&&<div className="conversation-empty"><MessageCircle size={19}/><p>Your ride conversations will find a home here.</p><Link href="/find-ride">Find a ride</Link></div>}</aside><section className="chat-panel">{conversation?<><div className="chat-header"><Avatar name={conversation.participantName}/><div><strong>{conversation.participantName}</strong><small><span className="online-dot"/> On Wayfare</small></div><button className="quiet-filter"><CircleHelp size={17}/> Safety tips</button></div><div className="chat-context"><Navigation size={14}/>{conversation.rideId?'Conversation about your shared ride':'Your Wayfare conversation'}</div><div className="chat-messages">{chatMessages.length?chatMessages.map((m:any)=><div key={m.id} className={`message-bubble ${m.senderId===data.user?.id?'mine':''}`}><p>{m.text}</p><small>{m.createdAt?new Date(m.createdAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'Just now'}</small></div>):<div className="chat-empty"><HeartHandshake size={19}/><strong>Good rides start with a hello.</strong><span>Coordinate the little things here.</span></div>}</div>{err&&<div className="inline-alert">{err}</div>}<form className="message-composer" onSubmit={send}><input aria-label="Write a message" placeholder="Write a message…" value={text} onChange={e=>setText(e.target.value)}/><button aria-label="Send message" disabled={!text.trim()}><Send size={17}/></button></form></>:<div className="chat-placeholder"><MessageCircle size={25}/><strong>Select a conversation</strong><span>Choose a person to pick up where you left off.</span></div>}</section></div></>;
}
function Notifications({data}:any){const [error,setError]=useState('');const mark=async(id:string)=>{try{await data.markNotificationRead(id);}catch(e:any){setError(e.message||'Could not mark as read.');}};return <><PageHeading eyebrow="A LITTLE HEADS-UP" title="Notifications" detail="The updates that keep your plans moving."/><div className="notification-toolbar"><span>{data.notifications?.filter((n:any)=>!n.read).length||0} unread</span><button onClick={()=>Promise.all((data.notifications||[]).filter((n:any)=>!n.read).map((n:any)=>mark(n.id)))}><Check size={14}/> Mark all as read</button></div>{error&&<div className="inline-alert">{error}</div>}{data.notifications?.length?<div className="notification-list">{data.notifications.map((n:any)=><article key={n.id} className={`notification-row ${!n.read?'unread':''}`}><span className="notification-icon">{n.type==='request'?<Inbox size={17}/>:n.type==='message'?<MessageCircle size={17}/>:<Bell size={17}/>}</span><div><strong>{n.title}</strong><p>{n.message}</p><small>{n.createdAt?new Date(n.createdAt).toLocaleString():''}</small></div>{!n.read&&<button className="mark-read" onClick={()=>mark(n.id)} aria-label="Mark as read"><Check size={16}/></button>}</article>)}</div>:<EmptyState title="All quiet on the commute." text="Requests, messages, and ride updates will find you here."/>}</>}

function Profile({data}:any){
 const p=data.profile||{};const [fullName,setFullName]=useState(p.fullName||'');const [bio,setBio]=useState(p.bio||'');const [location,setLocation]=useState(p.homeLocation||'');const [saved,setSaved]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{setFullName(p.fullName||'');setBio(p.bio||'');setLocation(p.homeLocation||'');},[p.fullName,p.bio,p.homeLocation]);
 const save=async(e:FormEvent)=>{e.preventDefault();setError('');try{await data.updateProfile({fullName,bio,homeLocation:location});setSaved(true);setTimeout(()=>setSaved(false),2500);}catch(e:any){setError(e.message||'Could not save your profile.');}};
 return <><PageHeading eyebrow="THE PERSON BEHIND THE WHEEL" title="Your profile" detail="The more people know, the more comfortable the first hello feels."/><div className="profile-layout"><section className="profile-card"><div className="profile-cover"><div className="cover-sun"/></div><div className="profile-card-main"><Avatar name={p.fullName||'Commuter'} className="avatar-profile"/><div className="profile-name"><h2>{p.fullName||'Your profile'}</h2><span><ShieldCheck size={15}/> Community member</span></div><div className="profile-rating"><Star size={16} fill="currentColor"/><b>{p.rating??'—'}</b><small>community rating</small></div><div className="profile-details"><span><MapPin size={15}/>{p.homeLocation||'Add your neighborhood'}</span><span><Users size={15}/>{p.role||'PASSENGER'}</span><span><MessageCircle size={15}/>{p.email||'Email not shared'}</span></div><form className="profile-edit" onSubmit={save}><label className="input-field"><span>Full name</span><input value={fullName} onChange={e=>setFullName(e.target.value)} required maxLength={100}/></label><label className="input-field"><span>About you</span><textarea rows={4} value={bio} onChange={e=>setBio(e.target.value)} placeholder="A little about how you like to travel…"/></label><label className="input-field"><span>Your neighborhood</span><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Indiranagar"/></label>{error&&<div className="inline-alert">{error}</div>}<Button type="submit">{saved?<><Check size={15}/> Saved</>:'Save profile'}</Button></form></div></section><aside className="profile-aside"><div className="trust-panel"><ShieldCheck size={20}/><h3>A good ride begins with trust.</h3><p>Keep your details current and talk through pickup plans before you set off.</p><Link href="/settings">Privacy and safety <ArrowRight size={14}/></Link></div><div className="profile-note"><div className="eyebrow">YOUR WAYFARE PROMISE</div><p>Be kind. Be on time. Leave a little room for the unexpected.</p></div></aside></div></>}
function SettingsPage({data}:any){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const signOut=async()=>{setBusy(true);setMessage('');try{await data.signOut();}catch(e:any){setMessage(e.message||'Sign out failed.');}finally{setBusy(false);}};
 return <><PageHeading eyebrow="MAKE IT YOURS" title="Settings" detail="Your account, privacy, and notification details."/><div className="settings-list">
  <section className="settings-section"><div><h2>Notifications</h2><p>Updates appear in the app when ride plans change.</p></div><div className="setting-row"><div><strong>In-app updates</strong><small>Requests, confirmations, and messages appear on your dashboard and notifications page.</small></div><span className="privacy-on"><Bell size={15}/> Active</span></div><div className="setting-row"><div><strong>Email notifications</strong><small>Email delivery is not configured for this app.</small></div><span className="privacy-on">Not enabled</span></div></section>
  <section className="settings-section"><div><h2>Privacy & safety</h2><p>Your account and conversation data use the access rules described in the security guide.</p></div><div className="setting-row"><div><strong>Profile</strong><small>Edit the information shown with your ride activity.</small></div><Link href="/profile" className="text-link">View profile <ArrowRight size={14}/></Link></div><div className="setting-row"><div><strong>Safety actions</strong><small>Report a ride or block a commuter from their ride details page.</small></div><span className="privacy-on"><ShieldCheck size={15}/> Available</span></div></section>
  <section className="settings-section"><div><h2>Account</h2><p>Manage your signed-in account.</p></div><div className="setting-row"><div><strong>{data.profile?.email||'Signed in account'}</strong><small>Email address on file</small></div><Link href="/profile" className="text-link">Edit profile <ArrowRight size={14}/></Link></div><div className="setting-row"><div><strong>Sign out</strong><small>You can sign back in whenever you’re ready.</small></div><Button variant="soft" disabled={busy} onClick={signOut}><LogOut size={15}/>{busy?'Signing out…':'Sign out'}</Button></div>{message&&<div className="inline-alert" role="alert">{message}</div>}</section>
 </div></>;
}

function AuthPage({data}:any){
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const isRecoveryInHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
  const [mode, setMode] = useState<'signin'|'forgot'|'reset'>(() => {
    if (params.get('mode') === 'reset' || isRecoveryInHash) return 'reset';
    return 'signin';
  });
  const [authMethod, setAuthMethod] = useState<'otp'|'password'>(() =>
    params.get('mode') === 'reset' || isRecoveryInHash ? 'password' : 'otp',
  );
  const [otpChannel, setOtpChannel] = useState<'phone'|'email'>('phone');
  const [otpStep, setOtpStep] = useState<'identifier'|'verify'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [, navigate] = useLocation();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (mode !== 'reset') return;
    const code = params.get('code');
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const isRecovery = hashParams.get('type') === 'recovery';
    if (code) {
      void requireSupabase().auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError) setError('This password reset link is invalid or has expired. Request a new one.');
      });
    } else if (isRecovery && accessToken && refreshToken) {
      void requireSupabase().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error: sessionError }) => {
        if (sessionError) setError('This password reset link is invalid or has expired. Request a new one.');
      });
    }
  }, [mode, params]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    setSuccess('');
    data.clearError();
    try {
      if (mode === 'signin') {
        await data.signIn(email, password);
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        await data.resetPasswordForEmail(email);
        setSuccess('Password reset link sent! Please check your email inbox to proceed.');
      } else if (mode === 'reset') {
        await data.updatePassword(password);
        setSuccess('Password updated successfully! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (e: any) {
      setError(e.message || 'We couldn’t complete your request. Check your details and try again.');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const requestOtp = async (e?: FormEvent, isResend = false) => {
    e?.preventDefault();
    if (submittingRef.current) return;

    const phoneDigits = isResend && /^\+91\d{10}$/.test(identifier)
      ? identifier.slice(3)
      : identifier.trim();
    const normalizedIdentifier = otpChannel === 'email'
      ? identifier.trim().toLowerCase()
      : `+91${phoneDigits}`;
    if (otpChannel === 'email' && !fullName.trim()) {
      setError('Enter your name.');
      return;
    }
    if (otpChannel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) {
      setError('Enter a valid email address.');
      return;
    }
    if (otpChannel === 'phone' && !/^\d{10}$/.test(phoneDigits)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (otpChannel === 'phone' && !fullName.trim()) {
      setError('Enter your name.');
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setResendingOtp(isResend);
    clearMessages();
    data.clearError();
    try {
      await data.sendOtp(otpChannel, normalizedIdentifier, fullName);
      setIdentifier(normalizedIdentifier);
      setOtp('');
      setOtpStep('verify');
      setResendCooldown(30);
      setSuccess(`A verification code was sent to ${normalizedIdentifier}.`);
    } catch (e: any) {
      const message = String(e?.message || '');
      setError(
        otpChannel === 'phone' && /unsupported phone provider/i.test(message)
          ? 'SMS OTP is not available because this Supabase project has no SMS provider configured. Configure a provider in Supabase Auth settings and try again. Supabase error: Unsupported phone provider.'
          : message || 'We could not send a verification code. Please try again.',
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
      setResendingOtp(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setError(`Enter the 6-digit verification code from your ${otpChannel === 'email' ? 'email' : 'phone'}.`);
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    clearMessages();
    data.clearError();
    try {
      await data.verifyOtp(otpChannel, identifier, otp.trim());
      navigate('/dashboard');
    } catch (e: any) {
      const message = String(e?.message || '');
      setError(
        /invalid|expired|otp|token/i.test(message)
          ? `That code is invalid or has expired. Request a new code and try again. ${message}`
          : message || 'That code could not be verified. Request a new code and try again.',
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const changeAuthMethod = (method: 'otp'|'password') => {
    setAuthMethod(method);
    setMode('signin');
    setOtpStep('identifier');
    setOtp('');
    setResendCooldown(0);
    clearMessages();
  };

  const changeOtpChannel = (channel: 'phone'|'email') => {
    setOtpChannel(channel);
    setIdentifier('');
    setOtpStep('identifier');
    setOtp('');
    setResendCooldown(0);
    clearMessages();
  };

  const continueAs = (role: 'PASSENGER' | 'ADMIN') => {
    data.enterDemo(role);
    navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-aside">
        <div className="auth-brand-row">
          <Link href="/" className="brand">
            <span className="brand-mark"><ArrowDownUp size={18}/></span>
            <span>wayfare<span className="brand-period">.</span></span>
          </Link>
          <span className="auth-brand-caption">COMMUNITY-POWERED COMMUTES</span>
        </div>
        <div className="auth-aside-copy">
          <div className="eyebrow eyebrow-light"><span className="auth-live-dot"/> EVERYDAY, BETTER CONNECTED</div>
          <h1>Find your people.<br/><em>Share your journey.</em></h1>
          <p>Smarter commutes begin with the people already headed your way.</p>
        </div>
        <div className="auth-journey" aria-hidden="true">
          <div className="auth-journey-top"><span>COMMUNITY ROUTE</span><span className="auth-journey-live"><i/> MATCHING NEARBY</span></div>
          <div className="auth-journey-map">
            <div className="auth-route-path"/>
            <span className="auth-route-point auth-route-start"/>
            <span className="auth-route-point auth-route-middle"/>
            <span className="auth-route-point auth-route-end"/>
            <span className="auth-route-car"><CarFront size={19}/></span>
            <span className="auth-route-person auth-person-one">A</span>
            <span className="auth-route-person auth-person-two">M</span>
          </div>
          <div className="auth-journey-locations">
            <span><small>STARTING NEAR</small><b>Indiranagar</b></span>
            <span><small>HEADING TO</small><b>Whitefield</b></span>
          </div>
          <div className="auth-journey-bottom"><span className="auth-people-stack"><i>A</i><i>M</i><i>+2</i></span><span>Good routes are better shared.</span><ArrowUpRight size={15}/></div>
        </div>
        <div className="auth-aside-foot"><ShieldCheck size={16}/><span>Thoughtful rides, with people along your route.</span><b>PRIVATE BY DESIGN</b></div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <Link href="/" className="brand">
              <span className="brand-mark"><ArrowDownUp size={18}/></span>
              <span>wayfare<span className="brand-period">.</span></span>
            </Link>
          </div>
          <div className="auth-panel-label"><ShieldCheck size={15}/><span>SECURE SIGN-IN</span></div>
          <div className="eyebrow">
            {authMethod === 'otp'
              ? otpStep === 'verify' ? `${otpChannel === 'email' ? 'EMAIL' : 'PHONE'} VERIFICATION` : 'THE COMMUTE, SHARED'
              : mode === 'signin' ? 'WELCOME BACK' : mode === 'forgot' ? 'ACCOUNT RECOVERY' : 'NEW CREDENTIALS'}
          </div>
          <h2>
            {authMethod === 'otp'
              ? otpStep === 'verify'
                ? otpChannel === 'email' ? 'Verify Your Email Address' : 'Verify Your Phone Number'
                : 'Good to see you.'
              : mode === 'signin' ? 'Good to see you.' : mode === 'forgot' ? 'Reset password' : 'Set new password'}
          </h2>
          <p>
            {authMethod === 'otp'
              ? otpStep === 'verify'
                ? `Enter the 6-digit code sent to your ${otpChannel === 'email' ? 'email' : 'phone'}: ${identifier}.`
                : 'Sign in or create an account with a one-time code.'
              : mode === 'signin'
                ? 'Your next shared commute is just ahead.'
                : mode === 'forgot'
                  ? 'Enter your email address to receive a secure recovery link.'
                  : 'Choose a strong new password for your account.'}
          </p>

          {mode === 'signin' && otpStep === 'identifier' && (
            <div className="auth-method-tabs" role="tablist" aria-label="Sign-in method">
              <button type="button" role="tab" aria-selected={authMethod === 'otp'} className={authMethod === 'otp' ? 'active' : ''} disabled={busy} onClick={() => changeAuthMethod('otp')}>One-time code</button>
              <button type="button" role="tab" aria-selected={authMethod === 'password'} className={authMethod === 'password' ? 'active' : ''} disabled={busy} onClick={() => changeAuthMethod('password')}>Password</button>
            </div>
          )}

          {authMethod === 'otp' ? (
            <>
              {otpStep === 'identifier' && (
                <div className="auth-mode auth-channel-tabs" role="tablist" aria-label="Code delivery method">
                  <button type="button" role="tab" aria-selected={otpChannel === 'phone'} className={otpChannel === 'phone' ? 'active' : ''} disabled={busy} onClick={() => changeOtpChannel('phone')}><Phone size={14}/> Mobile number</button>
                  <button type="button" role="tab" aria-selected={otpChannel === 'email'} className={otpChannel === 'email' ? 'active' : ''} disabled={busy} onClick={() => changeOtpChannel('email')}><Mail size={14}/> Email</button>
                </div>
              )}
              <form onSubmit={otpStep === 'identifier' ? requestOtp : verifyOtp} className="auth-form" noValidate>
                {otpStep === 'identifier' ? (
                  <>
                    {otpChannel === 'phone' ? (
                      <label className="input-field">
                        <span>Mobile number</span>
                        <input type="tel" inputMode="numeric" autoComplete="tel-national" value={identifier} onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={busy} required placeholder="9581889452" aria-label="10-digit Indian mobile number" maxLength={10}/>
                      </label>
                    ) : (
                      <label className="input-field">
                        <span>Email address</span>
                        <input type="email" inputMode="email" autoComplete="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} disabled={busy} required placeholder="you@example.com"/>
                      </label>
                    )}
                    <label className="input-field">
                      <span>Your name</span>
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy} autoComplete="name" maxLength={100} required placeholder="e.g. Avery Rao"/>
                    </label>
                    {error && <div className="inline-alert" role="alert">{error}</div>}
                    <Button type="submit" disabled={busy} className="full-width">
                      {busy ? 'Sending code…' : 'Continue'} <ArrowRight size={16}/>
                    </Button>
                  </>
                ) : (
                  <div className="auth-otp-screen">
                    <div className="auth-otp-close-row">
                      <button
                        type="button"
                        className="auth-otp-close"
                        aria-label={`Close ${otpChannel === 'email' ? 'email' : 'phone'} verification`}
                        disabled={busy}
                        onClick={() => {
                          if (otpChannel === 'phone') setIdentifier(identifier.replace(/^\+91/, ''));
                          setOtpStep('identifier');
                          setOtp('');
                          setResendCooldown(0);
                          clearMessages();
                        }}
                      >
                        <X size={18}/>
                      </button>
                    </div>
                    <div className="auth-otp-icon" aria-hidden="true">{otpChannel === 'email' ? <MailCheck size={27}/> : <Smartphone size={27}/>}</div>
                    <label className="auth-otp-label" htmlFor="email-verification-code">
                      6-digit verification code
                    </label>
                    <InputOTP
                      id="email-verification-code"
                      aria-label="6-digit verification code"
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                      disabled={busy}
                      containerClassName="auth-otp-input"
                    >
                      <InputOTPGroup className="auth-otp-group">
                        {Array.from({ length: 6 }, (_, index) => (
                          <InputOTPSlot key={index} index={index} className="auth-otp-slot"/>
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    {error && <div className="inline-alert" role="alert">{error}</div>}
                    {success && <div className="inline-alert" role="status">{success}</div>}
                    <Button type="submit" disabled={busy || otp.length !== 6} className="full-width otp-verify-button">
                      {busy ? 'Verifying…' : otpChannel === 'email' ? 'Verify Email' : 'Verify Phone'} <ArrowRight size={16}/>
                    </Button>
                    <div className="auth-otp-change">
                      {otpChannel === 'email' && <span>Want to Change Your Email Address?</span>}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (otpChannel === 'phone') setIdentifier(identifier.replace(/^\+91/, ''));
                          setOtpStep('identifier');
                          setOtp('');
                          setResendCooldown(0);
                          clearMessages();
                        }}
                      >
                        {otpChannel === 'phone' ? 'Change Number' : 'Change Here'}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="auth-otp-resend"
                      disabled={busy || resendCooldown > 0}
                      onClick={() => void requestOtp(undefined, true)}
                    >
                      <RefreshCw size={14}/>
                      {resendingOtp ? 'Sending code…' : resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : (
            <>
              <form onSubmit={submit} className="auth-form">
                {(mode === 'signin' || mode === 'forgot') && (
                  <label className="input-field"><span>Email address</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></label>
                )}
                {(mode === 'signin' || mode === 'reset') && (
                  <label className="input-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{mode === 'reset' ? 'New password' : 'Password'}</span>
                      {mode === 'signin' && <button type="button" className="auth-text-button" onClick={() => { setMode('forgot'); clearMessages(); }}>Forgot password?</button>}
                    </div>
                    <input type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required placeholder="At least 6 characters"/>
                  </label>
                )}
                {error && <div className="inline-alert" role="alert">{error}</div>}
                {success && <div className="inline-alert" role="status">{success}</div>}
                <Button type="submit" disabled={busy} className="full-width">
                  {busy ? 'One moment…' : mode === 'signin' ? 'Sign in to Wayfare' : mode === 'forgot' ? 'Send reset link' : 'Update password'} <ArrowRight size={16}/>
                </Button>
                {(mode === 'forgot' || mode === 'reset') && <button type="button" className="auth-text-button auth-back-button" onClick={() => { setMode('signin'); clearMessages(); }}>← Back to sign in</button>}
              </form>
            </>
          )}

          {!data.isBackendConfigured && (
            <div className="demo-actions">
              <span className="eyebrow">SAMPLE DATA ONLY · STORED IN THIS BROWSER</span>
              <Button type="button" variant="soft" onClick={() => continueAs('PASSENGER')}>Continue as demo commuter</Button>
              <Button type="button" variant="soft" onClick={() => continueAs('ADMIN')}>Open demo admin</Button>
            </div>
          )}

          <div className="auth-terms">By continuing, you agree to keep this community kind, considerate, and safe for everyone.</div>
          <div className="auth-mode-status">
            <span className={`mode-pill ${data.isBackendConfigured ? 'mode-live' : 'mode-demo'}`}>
              <i/>{data.isBackendConfigured ? 'Live account' : 'Demo mode'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
function AdminPage({data}:any){
 const [error,setError]=useState('');
 const review=async(reportId:string,status:string)=>{try{await data.updateReportStatus(reportId,status);}catch(e:any){setError(e?.message||'The report could not be updated.');}};
 if(data.profile?.role!=='ADMIN')return <><PageHeading eyebrow="COMMUNITY CARE" title="Admin" detail="Tools for trusted community administrators."/><div className="admin-banner"><ShieldCheck size={21}/><div><strong>Administrator access required.</strong><p>This account does not have permission to review community reports.</p></div></div></>;
 const reports=data.reports||[];const openReports=reports.filter((r:any)=>r.status==='OPEN'||r.status==='REVIEWING');const activeRides=(data.rides||[]).filter((r:any)=>r.status==='SCHEDULED'||r.status==='IN_PROGRESS').length;
 return <><PageHeading eyebrow="COMMUNITY CARE" title="Admin" detail="Review reports and keep the commute respectful."/><div className="admin-banner"><ShieldCheck size={21}/><div><strong>Administrator access is active.</strong><p>{data.backendMode==='demo'?'This is a local demo. Report changes stay in this browser.':'Reports and account data are protected by database policies.'}</p></div></div>{error&&<div className="inline-alert" role="alert">{error}</div>}<div className="stats-strip admin-stats"><Stat number={activeRides} label="scheduled rides" icon={Navigation}/><Stat number={data.requests?.length||0} label="ride requests" icon={Inbox}/><Stat number={openReports.length} label="reports to review" icon={ShieldCheck}/><Stat number={data.adminUsers?.length||0} label="profiles" icon={Users}/></div><section className="panel admin-panel"><div className="panel-heading"><div><div className="eyebrow">COMMUNITY SIGNALS</div><h2>Reports</h2></div><span className={`mode-pill ${data.backendMode==='demo'?'mode-demo':'mode-live'}`}><i/>{data.backendMode} data</span></div>{reports.length?<div className="request-list">{reports.map((report:any)=><article key={report.id} className="request-row"><span className="notification-icon"><ShieldCheck size={17}/></span><div className="request-person"><strong>{report.reason}</strong><small>Reported {report.reportedUserId?`account ${report.reportedUserId.slice(0,8)}`:'ride'} · {new Date(report.createdAt).toLocaleString()}</small><p>{report.description||'No additional details were included.'}</p></div><div className="request-row-side"><Status value={report.status}/>{report.status!=='RESOLVED'&&report.status!=='DISMISSED'&&<div className="request-row-actions"><Button variant="soft" onClick={()=>review(report.id,'DISMISSED')}>Dismiss</Button><Button onClick={()=>review(report.id,'RESOLVED')}>Resolve <Check size={14}/></Button></div>}</div></article>)}</div>:<EmptyState title="No reports to review." text="New safety reports will appear here for administrators."/>}</section><section className="panel admin-panel"><div className="panel-heading"><div><div className="eyebrow">ACCOUNT DIRECTORY</div><h2>Profiles</h2></div></div><div className="activity-list">{(data.adminUsers||[]).slice(0,20).map((person:any)=><div className="activity-item" key={person.id}><Avatar name={person.fullName}/><div><strong>{person.fullName||'Unnamed commuter'}</strong><p>{person.email} · {person.role}</p></div></div>)}</div></section></>;
}

function RouteContent(){
 const data=useCarpool() as any;const [path]=useLocation();
 if(path==='/auth')return <AuthPage data={data}/>;
 if(!data.user){
  if(data.loading)return <div className="skeleton-list"><div/><div/></div>;
  return <AuthPage data={data}/>;
 }
 return <AppFrame data={data}><Switch><Route path="/" component={()=><HomePage data={data}/>}/><Route path="/find-ride" component={()=><FindRides data={data}/>}/><Route path="/offer-ride" component={()=><OfferRide data={data}/>}/><Route path="/rides/:id" component={()=><RideDetail data={data}/>}/><Route path="/dashboard" component={()=><Dashboard data={data}/>}/><Route path="/my-rides" component={()=><MyRides data={data}/>}/><Route path="/requests" component={()=><Requests data={data}/>}/><Route path="/messages" component={()=><Messages data={data}/>}/><Route path="/notifications" component={()=><Notifications data={data}/>}/><Route path="/profile" component={()=><Profile data={data}/>}/><Route path="/settings" component={()=><SettingsPage data={data}/>}/><Route path="/admin" component={()=><AdminPage data={data}/>}/><Route component={()=><EmptyState title="This road isn’t on the map." text="That page may have moved. Head back and find another way." link="/" label="Back to Wayfare"/>}/></Switch></AppFrame>;
}
function RoutedErrorBoundary({children}:{children:ReactNode}){const [location]=useLocation();return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>}
function App(){return <CarpoolProvider><QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><RoutedErrorBoundary><RouteContent/></RoutedErrorBoundary></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider></CarpoolProvider>}
export default App;
