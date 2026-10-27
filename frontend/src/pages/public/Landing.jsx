import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  ShieldCheck,
  Activity,
  WifiOff,
  Stethoscope,
  Truck,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  Cpu,
  Layers,
  PhoneCall
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export function Landing() {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-500 selection:text-white">
      {/* 1. Public Navbar */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500 rounded-xl text-slate-950 shadow-md">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 leading-none">
                RuralCare AI
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">v1.0</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">AI-Assisted Emergency Response System</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button onClick={() => scrollToSection('hero')} className="hover:text-teal-400 transition-colors">Home</button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-teal-400 transition-colors">How It Works</button>
            <button onClick={() => scrollToSection('features')} className="hover:text-teal-400 transition-colors">Features</button>
            <button onClick={() => scrollToSection('offline-first')} className="hover:text-teal-400 transition-colors">Offline Tech</button>
            <button onClick={() => scrollToSection('ai-safety')} className="hover:text-teal-400 transition-colors">AI Safety</button>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-900">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">
                Register Account
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="hero" className="bg-slate-950 text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>AI-Assisted Clinical Decision Support System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            AI-Powered Emergency Response for <span className="text-teal-400">Rural Communities</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Fast, explainable and connected emergency decision support designed for resource-constrained environments with full offline functionality.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/citizen/report">
              <Button size="lg" variant="danger" icon={ShieldAlert}>
                Report an Emergency
              </Button>
            </Link>
            <Button
              onClick={() => scrollToSection('how-it-works')}
              size="lg"
              variant="outline"
              className="border-slate-700 text-slate-200 bg-slate-900 hover:bg-slate-800"
              icon={ArrowRight}
            >
              Explore How It Works
            </Button>
          </div>

          <div className="pt-8 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left text-xs text-slate-400">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="font-bold text-white text-sm">100% Offline</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Local IndexedDB & ML Triage</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="font-bold text-white text-sm">WHO Guidelines</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Clinical Rule Engine Triage</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="font-bold text-white text-sm">Idempotent Sync</p>
              <p className="text-[11px] text-slate-400 mt-0.5">UUID Duplicate Prevention</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="font-bold text-white text-sm">5-Role RBAC</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Strict DRF JWT Security</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (7-Step Workflow) */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">7-Step Emergency Workflow Pipeline</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            From citizen incident reporting to clinical triage, AI decision fusion, and hospital delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-center">
          {[
            { step: '1', title: 'Emergency Report', desc: 'Citizen submits initial report (UNVERIFIED)', icon: AlertCircle },
            { step: '2', title: 'Staff Verification', desc: 'Hospital Staff reviews & verifies incident', icon: ShieldCheck },
            { step: '3', title: 'Clinical Vitals', desc: 'Worker inputs patient vital signs', icon: Stethoscope },
            { step: '4', title: 'Rule Triage', desc: 'WHO protocol rules score severity', icon: Layers },
            { step: '5', title: 'ML Risk Scoring', desc: 'scikit-learn model evaluates clinical risk', icon: Cpu },
            { step: '6', title: 'Decision Fusion', desc: '60% Rule + 40% ML hybrid priority score', icon: Activity },
            { step: '7', title: 'Dispatch & Transport', desc: 'Ambulance assigned and tracked to hospital', icon: Truck },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 font-bold text-xs flex items-center justify-center mb-2">
                  {item.step}
                </div>
                <Icon className="w-6 h-6 text-slate-800 mb-2" />
                <h4 className="text-xs font-bold text-slate-900 mb-1">{item.title}</h4>
                <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. FEATURES GRID */}
      <section id="features" className="py-16 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white tracking-tight">Core System Capabilities</h2>
            <p className="text-sm text-slate-400 mt-1">Built specifically for rural emergency response and clinical decision support.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Smart Emergency Assessment', desc: 'Structured intake for vital signs, GCS scores, and clinical danger signs.', icon: Stethoscope },
              { title: 'Rule-Based Triage Engine', desc: 'Deterministic evaluation based on WHO triage protocols for guaranteed safety thresholds.', icon: ShieldCheck },
              { title: 'ML Risk Scoring', desc: 'Heuristic & trained classifier models for pattern recognition in vitals data.', icon: Cpu },
              { title: 'Explainable AI Decisions', desc: 'Transparent breakdown of clinical flags contributing to emergency priority.', icon: Activity },
              { title: 'Offline-First Storage', desc: 'Client IndexedDB engine preserving reports & assessments without network.', icon: WifiOff },
              { title: 'Ambulance Dispatch', desc: 'Centralized dispatcher fleet control for basic & advanced life support vehicles.', icon: Truck },
              { title: 'Hospital Network', desc: 'Real-time monitoring of ICU & general bed availability across rural care centers.', icon: Building2 },
              { title: 'Multi-Role Access Control', desc: 'Strict DRF JWT permissions for Citizens, Workers, Staff, Drivers, and Admins.', icon: Users },
            ].map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-teal-500/40 transition-colors">
                  <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl w-fit mb-4 border border-teal-500/20">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. OFFLINE-FIRST SECTION */}
      <section id="offline-first" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="p-5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl shrink-0">
            <WifiOff className="w-12 h-12 text-amber-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Offline-First Rural Resilience</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Core emergency assessment can continue when internet connectivity is unavailable. Emergency reports and clinical assessments are persisted locally in browser IndexedDB with unique UUID idempotency keys. Pending records are synchronized automatically when connectivity is restored without duplicating data.
            </p>
          </div>
        </div>
      </section>

      {/* 6. AI SAFETY SECTION */}
      <section id="ai-safety" className="py-12 bg-slate-100 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-teal-400 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-teal-400" />
            <span>Clinical Decision Support Disclaimer</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">AI Safety & Medical Governance</h3>
          <p className="text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
            RuralCare AI provides AI-assisted decision support. Final clinical decisions remain with qualified medical professionals. Citizen inputs are treated as UNVERIFIED reports until reviewed by authorized staff.
          </p>
        </div>
      </section>

      {/* 7. ROLES SECTION */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Roles & Operational Workflows</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { role: 'Citizen', desc: 'Submit initial emergency reports & track status' },
            { role: 'Emergency Worker', desc: 'Intake patient vitals & run offline AI decision fusion' },
            { role: 'Hospital Staff', desc: 'Verify citizen reports & dispatch available ambulances' },
            { role: 'Driver / Paramedic', desc: 'Receive dispatch calls & update trip progress' },
            { role: 'Administrator', desc: 'Manage users, hospitals, fleet & AI telemetry' },
          ].map((r, idx) => (
            <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl text-center">
              <h4 className="text-sm font-bold text-slate-900 mb-1">{r.role}</h4>
              <p className="text-xs text-slate-500">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-teal-400" />
            <span className="font-bold text-white">RuralCare AI</span>
            <span>— AI-Assisted Emergency Response System</span>
          </div>
          <div className="flex items-center gap-6 text-slate-500">
            <a href="#privacy" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-300">Terms of Service</a>
            <a href="#contact" className="hover:text-slate-300">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
