import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MainNavbar } from '../Layout/MainNavbar';
import { PublicFooter } from './PublicFooter';
import { 
  CheckIcon,
  SparklesIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BellIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

export const PricingPage: React.FC = () => {
  const features = [
    { icon: CalendarDaysIcon, text: 'Online zakazivanje termina 24/7' },
    { icon: UserGroupIcon, text: 'Upravljanje osobljem i uslugama' },
    { icon: ChartBarIcon, text: 'Statistika i izvještaji' },
    { icon: BellIcon, text: 'Automatske notifikacije klijentima' },
    { icon: CreditCardIcon, text: 'Praćenje prihoda' },
    { icon: SparklesIcon, text: 'Profil salona sa slikama' }
  ];

  return (
    <>
      <Helmet>
        <title>Cjenovnik | Frizerino – Transparentne cijene za salone</title>
        <meta name="description" content="Probajte Frizerino besplatno prvi mjesec. Zatim samo 10-20 KM mjesečno zavisno od broja zaposlenih. Bez skrivenih troškova." />
        <link rel="canonical" href="https://frizerino.com/cjenovnik" />
        
        {/* Schema.org - PriceSpecification */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Frizerino - Online zakazivanje za salone",
            "description": "Platforma za online zakazivanje termina u frizerskim i kozmetičkim salonima",
            "brand": {
              "@type": "Brand",
              "name": "Frizerino"
            },
            "offers": [
              {
                "@type": "Offer",
                "name": "Standardni Paket - Mjesečno",
                "description": "Za salone do 3 zaposlena",
                "price": "15",
                "priceCurrency": "BAM",
                "priceValidUntil": "2025-12-31",
                "availability": "https://schema.org/InStock",
                "billingIncrement": "P1M"
              },
              {
                "@type": "Offer",
                "name": "Standardni Paket - Godišnje",
                "description": "Za salone do 3 zaposlena - ušteda 60 KM",
                "price": "120",
                "priceCurrency": "BAM",
                "priceValidUntil": "2025-12-31",
                "availability": "https://schema.org/InStock",
                "billingIncrement": "P1Y"
              },
              {
                "@type": "Offer",
                "name": "Prošireni Paket",
                "description": "Za salone sa 4-10 zaposlenih",
                "price": "20",
                "priceCurrency": "BAM",
                "priceValidUntil": "2025-12-31",
                "availability": "https://schema.org/InStock",
                "billingIncrement": "P1M"
              }
            ]
          })}
        </script>
      </Helmet>

      <MainNavbar />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Jednostavni i Transparentni Cjenovnik
            </h1>
            <p className="text-xl text-orange-100 max-w-2xl mx-auto mb-6">
              Bez skrivenih troškova. Bez ugovora. Otkažite bilo kada.
            </p>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
              <SparklesIcon className="w-6 h-6" />
              <span className="font-semibold text-lg">Prvi mjesec potpuno BESPLATAN</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Free Trial Banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Probajte Besplatno 30 Dana
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
              Testirajte sve funkcionalnosti platforme bez ikakvih obaveza. 
              Odlučite da li je Frizerino pravo rješenje za vaš salon.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span>Bez kreditne kartice</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span>Bez ugovora</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span>Otkažite bilo kada</span>
              </div>
            </div>
          </div>

          {/* Main Pricing Card - Centered and Large */}
          <div className="max-w-2xl mx-auto mb-16">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-orange-500 relative">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 text-sm font-semibold rounded-bl-2xl">
                Najpopularnije
              </div>
              
              <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-8 text-center">
                <h2 className="text-3xl font-bold mb-2">Standardni Paket</h2>
                <p className="text-orange-100 text-lg">Za sve salone do 3 zaposlena</p>
              </div>
              
              <div className="p-8">
                {/* Pricing Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Monthly */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-orange-300 transition-all">
                    <div className="text-center mb-4">
                      <div className="text-sm text-gray-600 mb-2">Mjesečno plaćanje</div>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-5xl font-bold text-gray-900">15</span>
                        <div className="text-left">
                          <div className="text-xl font-semibold text-gray-900">KM</div>
                          <div className="text-sm text-gray-600">/mjesec</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-600">
                      Plaćate mjesečno
                    </div>
                  </div>

                  {/* Yearly - Highlighted */}
                  <div className="border-2 border-orange-500 bg-orange-50 rounded-xl p-6 relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                      Uštedite 60 KM
                    </div>
                    <div className="text-center mb-4">
                      <div className="text-sm text-orange-700 font-medium mb-2">Godišnje plaćanje</div>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-5xl font-bold text-orange-600">10</span>
                        <div className="text-left">
                          <div className="text-xl font-semibold text-orange-600">KM</div>
                          <div className="text-sm text-orange-700">/mjesec</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-orange-700 font-medium">
                      120 KM plaćeno unaprijed
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4 text-center">Sve funkcionalnosti uključene:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <Link
                  to="/register"
                  className="block w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-center py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Počni besplatno danas
                </Link>
                <p className="text-center text-sm text-gray-500 mt-3">
                  Bez kreditne kartice • Otkažite bilo kada
                </p>
              </div>
            </div>
          </div>

          {/* Additional Plans - Text Based */}
          <div className="max-w-4xl mx-auto mb-12">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Dodatne opcije za veće salone
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 4-10 employees */}
              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 hover:border-orange-300 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">4-10 zaposlenih</h4>
                    <p className="text-gray-600 text-sm">Za srednje i veće salone</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-orange-600">20 KM</div>
                    <div className="text-sm text-gray-600">/mjesec</div>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Sve standardne funkcionalnosti
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Prioritetna podrška
                  </li>
                </ul>
                <Link
                  to="/register"
                  className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-2.5 rounded-lg font-semibold transition-colors text-sm"
                >
                  Počni besplatno
                </Link>
              </div>

              {/* 10+ employees */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm border-2 border-gray-300 p-6">
                <div className="mb-4">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">Preko 10 zaposlenih</h4>
                  <p className="text-gray-600 text-sm">Enterprise rješenje</p>
                </div>
                <div className="mb-4">                  
                  <p className="text-sm text-gray-600">
                    Prilagođena cijena i funkcionalnosti prema vašim potrebama
                  </p>
                </div>                
                <Link
                  to="/kontakt"
                  className="block w-full bg-gray-800 hover:bg-gray-900 text-white text-center py-2.5 rounded-lg font-semibold transition-colors text-sm"
                >
                  Kontaktirajte nas
                </Link>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Često postavljana pitanja
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Šta je uključeno u besplatni probni period?
                </h3>
                <p className="text-gray-600 text-sm">
                  Sve funkcionalnosti platforme su dostupne tokom 30 dana besplatnog perioda. 
                  Nema ograničenja ni skrivenih troškova.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Da li moram unijeti podatke kreditne kartice?
                </h3>
                <p className="text-gray-600 text-sm">
                  Ne, za besplatni probni period nije potrebna kreditna kartica. 
                  Plaćanje se aktivira tek nakon što odlučite nastaviti korištenje.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Mogu li otkazati pretplatu bilo kada?
                </h3>
                <p className="text-gray-600 text-sm">
                  Da, možete otkazati pretplatu bilo kada bez ikakvih penala. 
                  Nema ugovora ni obaveza.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Kako se vrši plaćanje?
                </h3>
                <p className="text-gray-600 text-sm">
                  Plaćanje se vrši mjesečno ili godišnje putem bankovnog transfera ili 
                  kreditne kartice. Dobijate fakturu za svaku uplatu.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Šta ako imam više od 3 zaposlena?
                </h3>
                <p className="text-gray-600 text-sm">
                  Za salone sa 4-10 zaposlenih cijena je 20 KM mjesečno. 
                  Za veće salone kontaktirajte nas za prilagođenu ponudu.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Da li postoje dodatni troškovi?
                </h3>
                <p className="text-gray-600 text-sm">
                  Ne, nema skrivenih troškova. Cijena koju vidite je konačna cijena 
                  koja uključuje sve funkcionalnosti.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Spremni za digitalizaciju vašeg salona?
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
              Pridružite se stotinama salona koji već koriste Frizerino za upravljanje rezervacijama
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-block"
              >
                Počni besplatno danas
              </Link>
              <Link
                to="/kontakt"
                className="bg-orange-700 hover:bg-orange-800 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-block"
              >
                Kontaktirajte nas
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
};

export default PricingPage;
