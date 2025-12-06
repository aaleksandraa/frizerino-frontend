import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MainNavbar } from '../Layout/MainNavbar';
import { PublicFooter } from './PublicFooter';
import { 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const ContactPage: React.FC = () => {
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.email || !form.message) {
      setError('Molimo popunite sva obavezna polja');
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate sending (in production, this would call an API)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setError('Greška pri slanju poruke. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Kontakt | Frizersko-Kozmetički Saloni BiH</title>
        <meta name="description" content="Kontaktirajte nas za sva pitanja o frizersko-kozmetičkim salonima u Bosni i Hercegovini. Tu smo da vam pomognemo." />
        <link rel="canonical" href="/kontakt" />
      </Helmet>

      <MainNavbar />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Kontaktirajte Nas
            </h1>
            <p className="text-xl text-orange-100 max-w-2xl mx-auto">
              Imate pitanja? Tu smo da vam pomognemo. Pišite nam ili nas nazovite.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Informacije
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <MapPinIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Adresa</h3>
                      <p className="text-gray-600">
                        Ferhadija 15<br />
                        71000 Sarajevo<br />
                        Bosna i Hercegovina
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <PhoneIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Telefon</h3>
                      <p className="text-gray-600">
                        <a href="tel:+38733123456" className="hover:text-orange-600">
                          +387 33 123 456
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <EnvelopeIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Email</h3>
                      <p className="text-gray-600">
                        <a href="mailto:info@frizerski-saloni.ba" className="hover:text-orange-600">
                          info@frizerski-saloni.ba
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <ClockIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Radno vrijeme podrške</h3>
                      <p className="text-gray-600">
                        Pon - Pet: 09:00 - 17:00<br />
                        Sub: 09:00 - 13:00
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Quick Links */}
              <div className="bg-orange-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Česta pitanja</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/pomoc/kako-registrovati-salon" className="text-orange-600 hover:underline">
                      Kako registrovati salon?
                    </Link>
                  </li>
                  <li>
                    <Link to="/pomoc/kako-zakazati-termin" className="text-orange-600 hover:underline">
                      Kako zakazati termin?
                    </Link>
                  </li>
                  <li>
                    <Link to="/pomoc/kako-otkazati-rezervaciju" className="text-orange-600 hover:underline">
                      Kako otkazati rezervaciju?
                    </Link>
                  </li>
                  <li>
                    <Link to="/politika-privatnosti" className="text-orange-600 hover:underline">
                      Politika privatnosti
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Pošaljite nam poruku
                </h2>

                {success ? (
                  <div className="text-center py-12">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Poruka uspješno poslana!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Hvala vam na poruci. Odgovorit ćemo vam u najkraćem mogućem roku.
                    </p>
                    <button
                      onClick={() => setSuccess(false)}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Pošalji novu poruku
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ime i prezime *
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Vaše ime"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email adresa *
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="vas@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tema
                      </label>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Izaberite temu</option>
                        <option value="general">Opšto pitanje</option>
                        <option value="salon">Registracija salona</option>
                        <option value="booking">Pitanje o rezervaciji</option>
                        <option value="technical">Tehnička podrška</option>
                        <option value="partnership">Saradnja</option>
                        <option value="other">Ostalo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Poruka *
                      </label>
                      <textarea
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                        placeholder="Napišite vašu poruku..."
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                        <ExclamationCircleIcon className="w-5 h-5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {loading && (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {loading ? 'Slanje...' : 'Pošalji poruku'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
};

export default ContactPage;
