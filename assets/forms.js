/* ==========================================================================
   4 Savings Solutions — quote forms (/formularios/...)
   One schema per insurance line, rendered in English or Portuguese.
   Supports conditional fields, repeatable groups, file uploads and
   accessible validation. Submits to CONFIG.endpoint when set; otherwise
   hands the answers off to WhatsApp.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    // URL that receives each submission as multipart/form-data, files included.
    // Empty = the site's own /api/submit (Vercel function that emails contacts@savings-solutions.com).
    // If that function is not configured yet, the form falls back to WhatsApp automatically.
    endpoint: '',
    maxUploadBytes: 4.2 * 1024 * 1024
  };

  var lang = (document.documentElement.lang || 'pt').toLowerCase().indexOf('pt') === 0 ? 'pt' : 'en';
  var site = window.ssSite || {};
  var BASE = site.base || '../../';

  /* ------------------------------------------------------------------
     Schema helpers
     ------------------------------------------------------------------ */
  function L(en, pt) { return { en: en, pt: pt }; }
  function t(v) { return v == null ? '' : (typeof v === 'string' ? v : v[lang]); }
  function opt(v, en, pt) { return { v: v, label: L(en, pt || en) }; }

  var YES_NO = [opt('yes', 'Yes', 'Sim'), opt('no', 'No', 'Não')];
  var NO_YES = [opt('no', 'No', 'Não'), opt('yes', 'Yes', 'Sim')];

  function text(name, label, o) { return Object.assign({ type: 'text', name: name, label: label }, o || {}); }
  function req(f) { f.required = true; return f; }
  function yn(name, label, o) { return Object.assign({ type: 'radio', name: name, label: label, options: YES_NO }, o || {}); }
  function ny(name, label, o) { return Object.assign({ type: 'radio', name: name, label: label, options: NO_YES }, o || {}); }
  function when(field, value, fields) {
    return fields.map(function (f) { f.showIf = { field: field, value: value }; return f; });
  }

  function address(prefix, streetLabel, required) {
    return [
      Object.assign(text(prefix + 'street', streetLabel, { autocomplete: prefix ? null : 'street-address', width: 'wide' }), { required: !!required }),
      text(prefix + 'apt', L('Apt / unit', 'Apto / unidade'), { width: 'narrow' }),
      Object.assign(text(prefix + 'city', L('City', 'Cidade'), { autocomplete: prefix ? null : 'address-level2' }), { required: !!required }),
      Object.assign(text(prefix + 'zip', L('ZIP Code', 'ZIP Code'), { inputmode: 'numeric', autocomplete: prefix ? null : 'postal-code', width: 'narrow' }), { required: !!required })
    ];
  }
  function fullName() { return req(text('full_name', L('Full name', 'Nome completo'), { autocomplete: 'name' })); }
  function email() { return req({ type: 'email', name: 'email', label: L('Email', 'E-mail'), autocomplete: 'email' }); }
  function phone(label) { return req({ type: 'tel', name: 'phone', label: label || L('Phone number in the U.S.', 'Telefone nos EUA'), autocomplete: 'tel' }); }
  function usPhone() {
    return [
      req(yn('has_us_phone', L('Do you have a phone number in the U.S.?', 'Você tem telefone nos EUA?'))),
      when('has_us_phone', 'yes', [req({ type: 'tel', name: 'phone', label: L('Phone number', 'Telefone'), autocomplete: 'tel' })])[0],
      when('has_us_phone', 'no', [req({ type: 'tel', name: 'phone_other', label: L('WhatsApp or phone (with country code)', 'WhatsApp ou telefone (com código do país)'), autocomplete: 'tel' })])[0]
    ];
  }
  function partner(extra) {
    return [req(ny('partner', L('Do you have a partner or spouse?', 'Você tem cônjuge ou companheiro(a)?')))]
      .concat(when('partner', 'yes', [req(text('partner_name', L('Partner\'s full name', 'Nome completo do(a) cônjuge')))].concat(extra || [])));
  }
  function money(name, label, required) {
    return Object.assign({ type: 'text', name: name, label: label, inputmode: 'decimal', prefix: '$' }, { required: !!required });
  }
  function photos(name, label, o) {
    return Object.assign({ type: 'file', name: name, label: label, accept: 'image/*,application/pdf', multiple: true }, o || {});
  }
  function hearAbout() {
    return {
      title: L('How did you find us?', 'Como você nos conheceu?'),
      fields: [
        req({ type: 'radio', name: 'hear_about', label: L('How did you hear about us?', 'Como você conheceu a gente?'), options: [
          opt('google', 'Google'), opt('facebook', 'Facebook'), opt('instagram', 'Instagram'),
          opt('grupo_maes', 'Grupo das Mães'), opt('dealer', 'Insurance dealer / car dealership', 'Concessionária / revendedor de carros'),
          opt('referral', 'Family / friends', 'Indicação de amigos / família'), opt('other', 'Other', 'Outro')
        ] }),
        when('hear_about', 'referral', [text('referral_name', L('Please enter their name', 'Qual o nome de quem indicou?'))])[0]
      ].concat(when('hear_about', 'dealer', [
        req(text('dealer_shop', L('Name of the dealership', 'Nome da concessionária / loja'))),
        req(text('salesperson', L('Name of the salesperson', 'Nome do vendedor')))
      ])).concat(when('hear_about', 'other', [req(text('hear_other', L('Please specify', 'Especifique')))])).concat([
        { type: 'textarea', name: 'extra_info', label: L('Any other relevant information not mentioned above?', 'Alguma outra informação importante que não foi perguntada?') }
      ])
    };
  }
  function vehicles() {
    return {
      type: 'repeat', name: 'vehicles', min: 1, max: 10,
      label: L('VIN of each vehicle', 'VIN de cada veículo'),
      help: L('Type the VIN or attach a photo of it. Add one entry per vehicle.', 'Digite o número do VIN ou anexe uma foto. Adicione um item para cada veículo.'),
      item: L('Vehicle', 'Veículo'), add: L('Add another vehicle', 'Adicionar outro veículo'),
      oneOf: ['vin', 'vin_photo'],
      oneOfError: L('Type the VIN or attach a photo for each vehicle.', 'Digite o VIN ou anexe uma foto de cada veículo.'),
      fields: [
        text('vin', L('VIN (17 characters)', 'VIN (17 caracteres)'), { maxlength: 17, style: 'uppercase' }),
        photos('vin_photo', L('or photo of the VIN', 'ou foto do VIN'), { multiple: false, accept: 'image/*' })
      ]
    };
  }
  var VEHICLE_USE = [
    opt('personal', 'Personal only', 'Somente pessoal'),
    opt('personal_commercial', 'Personal and commercial', 'Pessoal e comercial'),
    opt('personal_rideshare', 'Personal and Uber/Lyft', 'Pessoal e Uber/Lyft'),
    opt('commercial', 'Commercial only', 'Somente comercial')
  ];
  var REGISTRATION = [opt('personal', 'In my own name', 'No meu nome'), opt('business', 'In a business name', 'No nome de uma empresa')];
  var SSN_HELP = L('Optional on this form. If you prefer, we can collect it by phone.', 'Opcional aqui. Se preferir, pegamos por telefone.');

  /* ------------------------------------------------------------------
     The forms
     ------------------------------------------------------------------ */
  var FORMS = {
    'auto': {
      title: L('Personal Auto', 'Seguro de Carro'),
      intro: L('Tell us about you, your household and your vehicles. A licensed advisor will compare carriers and send you a quote.', 'Conte sobre você, quem mora com você e seus veículos. Um agente licenciado compara as seguradoras e envia sua cotação.'),
      sections: [
        { title: L('Your information', 'Seus dados'), fields: [fullName(), email()].concat(usPhone()) },
        { title: L('Address', 'Endereço'), fields: address('', L('Street address', 'Endereço'), true).concat([
          req({ type: 'radio', name: 'own_rent', label: L('Do you own or rent your home?', 'Você é dono(a) ou aluga a casa onde mora?'), options: [opt('own', 'Own', 'Próprio'), opt('rent', 'Rent', 'Aluguel')] })
        ]) },
        { title: L('Household', 'Quem mora com você'), fields: partner().concat([
          req(yn('household', L('Does anyone else age 14 or older live at this address (even if they don\'t drive)?', 'Mais alguém com 14 anos ou mais mora neste endereço (mesmo que não dirija)?'), {
            help: L('Insurers usually require every household member age 14 and older to be listed on the policy, even if they do not drive.', 'As seguradoras normalmente exigem que todos os moradores com 14 anos ou mais estejam na apólice, mesmo que não dirijam.')
          }))
        ]).concat(when('household', 'yes', [{
          type: 'repeat', name: 'household_members', min: 1, max: 8,
          label: L('Household members', 'Moradores'), item: L('Person', 'Pessoa'), add: L('Add another person', 'Adicionar outra pessoa'),
          fields: [req(text('name', L('Full name', 'Nome completo'))), req({ type: 'date', name: 'dob', label: L('Date of birth', 'Data de nascimento') })]
        }])).concat([req(text('occupation', L('What is your occupation?', 'Qual é a sua profissão?')))]) },
        { title: L('Vehicles', 'Veículos'), fields: [
          req(text('financed', L('Are any of your vehicles financed? Which ones?', 'Algum veículo é financiado? Qual?'), { placeholder: L('e.g. 2019 Toyota Corolla, or "none"', 'ex.: Toyota Corolla 2019, ou "nenhum"') })),
          req({ type: 'radio', name: 'vehicle_use', label: L('How are your vehicles used?', 'Como os veículos são usados?'), options: VEHICLE_USE }),
          req({ type: 'radio', name: 'registration', label: L('Is the vehicle registered in your own name or a business name?', 'O veículo está registrado no seu nome ou no nome de uma empresa?'), options: REGISTRATION }),
          req(yn('active_policy', L('Do you currently have an active auto insurance policy?', 'Você tem uma apólice de seguro de carro ativa hoje?'))),
          req(photos('dl_photos', L('Photo of the driver\'s license of everyone who will drive', 'Foto da carteira de motorista (DL) de todos que vão dirigir'), { help: L('You can select several files.', 'Você pode selecionar vários arquivos.') })),
          vehicles()
        ] },
        hearAbout()
      ]
    },

    'auto-comercial': {
      title: L('Commercial Auto', 'Seguro de Veículo Comercial'),
      intro: L('For vans, pickups and trucks used for work. Tell us about your business and vehicles.', 'Para vans, pickups e caminhões usados no trabalho. Conte sobre sua empresa e seus veículos.'),
      sections: [
        { title: L('Your information', 'Seus dados'), fields: [fullName(), email()].concat(usPhone()) },
        { title: L('Address', 'Endereço'), fields: address('', L('Street address', 'Endereço'), true).concat([
          req(yn('same_garage', L('Is this the same address where the vehicles are kept (garaged)?', 'É o mesmo endereço onde os veículos ficam guardados?')))
        ]).concat(when('same_garage', 'no', address('garage_', L('Garaging address', 'Endereço onde os veículos ficam'), true))) },
        { title: L('Your business', 'Sua empresa'), fields: [
          text('business_name', L('Name of your registered business', 'Nome da empresa registrada')),
          req(text('occupation', L('What does your business do?', 'Qual é o ramo da empresa?'), { placeholder: L('e.g. painting, flooring, pool care, cleaning, landscaping', 'ex.: pintura, piso, piscina, limpeza, paisagismo') }))
        ].concat(partner()).concat([
          req(yn('has_gl', L('Do you have an active General Liability policy?', 'Você tem uma apólice de General Liability ativa?'))),
          req(yn('has_wc', L('Do you have an active Workers\' Comp policy?', 'Você tem uma apólice de Workers\' Comp ativa?')))
        ]) },
        { title: L('Vehicles', 'Veículos'), fields: [
          req(text('financed', L('Are any of your vehicles financed? Which ones?', 'Algum veículo é financiado? Qual?'), { placeholder: L('e.g. 2021 Ford Transit, or "none"', 'ex.: Ford Transit 2021, ou "nenhum"') })),
          req({ type: 'radio', name: 'vehicle_use', label: L('How are your vehicles used?', 'Como os veículos são usados?'), options: VEHICLE_USE }),
          req({ type: 'radio', name: 'registration', label: L('Is the vehicle registered in your own name or a business name?', 'O veículo está registrado no seu nome ou no nome de uma empresa?'), options: REGISTRATION }),
          req(yn('prior_auto_6m', L('Have you had an auto policy (personal or commercial) active for at least 6 months in a row?', 'Você tem seguro de carro (pessoal ou comercial) ativo há pelo menos 6 meses seguidos?'))),
          req(photos('dl_photos', L('Photo of the driver\'s license of everyone who will drive', 'Foto da carteira de motorista (DL) de todos que vão dirigir'), { help: L('You can select several files.', 'Você pode selecionar vários arquivos.') })),
          vehicles()
        ] },
        hearAbout()
      ]
    },

    'residencial': {
      title: L('Homeowners Insurance', 'Seguro Residencial'),
      intro: L('Tell us about you and the property. We will compare homeowners policies from several carriers.', 'Conte sobre você e o imóvel. Vamos comparar apólices residenciais de várias seguradoras.'),
      sections: [
        { title: L('Insured', 'Segurado'), fields: [
          req(text('first_name', L('First / given name(s)', 'Nome(s)'), { autocomplete: 'given-name' })),
          req(text('last_name', L('Last / family name(s)', 'Sobrenome(s)'), { autocomplete: 'family-name' })),
          req({ type: 'date', name: 'dob', label: L('Date of birth', 'Data de nascimento'), autocomplete: 'bday' }),
          req(text('occupation', L('Occupation', 'Profissão'))),
          email(), phone()
        ].concat(address('', L('Mailing address', 'Endereço de correspondência'), true)).concat(partner([
          req({ type: 'date', name: 'partner_dob', label: L('Partner\'s date of birth', 'Data de nascimento do(a) cônjuge') }),
          text('partner_occupation', L('Partner\'s occupation', 'Profissão do(a) cônjuge')),
          { type: 'tel', name: 'partner_phone', label: L('Partner\'s phone number', 'Telefone do(a) cônjuge') }
        ])) },
        { title: L('Property', 'Imóvel'), fields: address('prop_', L('Street address of the property to be insured', 'Endereço do imóvel a ser segurado'), true).concat([
          req({ type: 'radio', name: 'title_name', label: L('Is the title in your own name or a business name?', 'A escritura está no seu nome ou no nome de uma empresa?'), options: REGISTRATION }),
          when('title_name', 'business', [req(text('title_business', L('Business name', 'Nome da empresa')))])[0],
          req({ type: 'radio', name: 'paid_financed', label: L('Is the property paid in full or financed?', 'O imóvel está quitado ou financiado?'), options: [opt('paid', 'Paid in full', 'Quitado'), opt('financed', 'Financed', 'Financiado')] }),
          req({ type: 'radio', name: 'property_use', label: L('How is the property used?', 'Qual é o uso do imóvel?'), options: [
            opt('primary', 'Primary residence', 'Residência principal'),
            opt('secondary', 'Secondary residence', 'Segunda residência'),
            opt('rented_annual', 'Rented on a yearlong lease', 'Alugado com contrato anual'),
            opt('rented_short', 'For rent / short-term rental', 'Para alugar / aluguel de temporada'),
            opt('vacant', 'Not occupied', 'Desocupado')
          ] }),
          req(yn('renovated', L('Has the property had any improvements or renovation?', 'O imóvel passou por alguma reforma ou melhoria?'))),
          when('renovated', 'yes', [req(text('renovated_year', L('In what year?', 'Em que ano?'), { inputmode: 'numeric', width: 'narrow' }))])[0],
          yn('roof_replaced', L('If it is a house, has the roof been repaired or replaced?', 'Se for casa, o telhado já foi consertado ou trocado?')),
          when('roof_replaced', 'yes', [text('roof_year', L('In what year?', 'Em que ano?'), { inputmode: 'numeric', width: 'narrow' })])[0],
          req(yn('gated_community', L('Is it in a closed (gated) community?', 'Fica em condomínio fechado?'))),
          when('gated_community', 'yes', [{ type: 'radio', name: 'gate_type', label: L('Does it have a gate or an attendant?', 'Tem portão ou porteiro?'), options: [opt('gate', 'Gate', 'Portão'), opt('attendant', 'Attendant', 'Porteiro')] }])[0],
          req(yn('fire_alarm', L('Does the property have a fire alarm?', 'O imóvel tem alarme de incêndio?'))),
          when('fire_alarm', 'yes', [yn('fire_alarm_monitored', L('Is it monitored?', 'É monitorado?'))])[0],
          req(yn('security', L('Does it have a home security system?', 'Tem sistema de segurança (alarme)?'))),
          when('security', 'yes', [yn('security_monitored', L('Is it monitored?', 'É monitorado?'))])[0],
          yn('sprinkler', L('Does it have a fire sprinkler system?', 'Tem sistema de sprinklers contra incêndio?')),
          yn('pool', L('If it is a house, does it have a pool?', 'Se for casa, tem piscina?')),
          when('pool', 'yes', [yn('pool_screen', L('Is it enclosed by a screen?', 'Ela é cercada por tela (screen)?'))])[0],
          req(yn('pets', L('Do you have pets?', 'Você tem animais de estimação?'))),
          when('pets', 'yes', [req(text('pets_type', L('What kind? (include breed for dogs)', 'Quais? (informe a raça se for cachorro)')))])[0],
          req(yn('active_policy', L('Does this property currently have an active insurance policy?', 'O imóvel tem seguro ativo hoje?'))),
          when('active_policy', 'no', [req({ type: 'radio', name: 'no_policy_reason', label: L('Why not?', 'Por quê?'), options: [
            opt('new_purchase', 'It is a new purchase', 'É uma compra nova'),
            opt('not_covered', 'The property is currently not covered', 'O imóvel está sem seguro no momento')
          ] })])[0],
          when('no_policy_reason', 'new_purchase', [req({ type: 'date', name: 'closing_date', label: L('Closing date', 'Data do closing') })])[0],
          req({ type: 'date', name: 'effective_date', label: L('Policy start date', 'Data de início da apólice') })
        ]) },
        hearAbout()
      ]
    },

    'aluguel': {
      title: L('Renters Insurance', 'Seguro para Inquilinos'),
      intro: L('Protects your belongings and liability in the home you rent. Often required by the landlord.', 'Protege seus bens e sua responsabilidade no imóvel alugado. Muitas vezes é exigido pelo proprietário.'),
      sections: [
        { title: L('Who signs the lease', 'Quem assina o contrato'), fields: [
          req(text('full_name', L('Full name of the person signing the lease', 'Nome completo de quem assina o contrato'), { autocomplete: 'name' })),
          req({ type: 'date', name: 'dob', label: L('Date of birth', 'Data de nascimento'), autocomplete: 'bday' }),
          email(), phone(L('Phone number', 'Telefone')),
          req(yn('co_lessee', L('Will anyone else be on the lease?', 'Mais alguém vai assinar o contrato?'))),
          when('co_lessee', 'yes', [req({ type: 'textarea', name: 'co_lessee_info', label: L('Their full name, date of birth and email', 'Nome completo, data de nascimento e e-mail dessa pessoa') })])[0]
        ] },
        { title: L('Rented home', 'Imóvel alugado'), fields: address('', L('Street address of the rented home', 'Endereço do imóvel alugado'), true).concat([
          text('community', L('Neighborhood or community name', 'Nome do bairro ou condomínio')),
          req({ type: 'date', name: 'move_in', label: L('Move-in date', 'Data da mudança') })
        ]) },
        hearAbout()
      ]
    },

    'general-liability': {
      title: L('General Liability', 'General Liability'),
      intro: L('Covers injuries and damage your business causes to others. Often required by clients and general contractors.', 'Cobre danos e acidentes que sua empresa causa a terceiros. Muitas vezes exigido por clientes e empreiteiros.'),
      sections: [
        { title: L('Business', 'Empresa'), fields: [
          fullName(),
          text('business_name', L('Business name', 'Nome da empresa')),
          req(text('fein', L('FEIN / EIN number', 'Número FEIN / EIN'))),
        ].concat(address('', L('Street address', 'Endereço'), true)).concat([email(), phone(L('Phone number', 'Telefone'))]) },
        { title: L('Operations', 'Operação'), fields: [
          req(text('occupation', L('What does your business do?', 'Qual é o ramo da empresa?'), { placeholder: L('e.g. flooring, lawn care, pool care, cleaning', 'ex.: piso, jardinagem, piscina, limpeza') })),
          req(yn('w2', L('Do you have W-2 employees?', 'Você tem funcionários registrados (W-2)?'))),
          when('w2', 'yes', [req(money('w2_payroll', L('Yearly payroll paid to employees', 'Valor anual pago aos funcionários')))])[0],
          req(yn('subs', L('Do you use subcontractors?', 'Você usa subcontratados?'))),
          when('subs', 'yes', [req(money('subs_payment', L('Yearly amount paid to subcontractors', 'Valor anual pago aos subcontratados')))])[0],
          money('gross_income', L('Annual gross revenue of the business', 'Faturamento bruto anual da empresa'), true)
        ] },
        hearAbout()
      ]
    },

    'workers-comp': {
      title: L('Workers\' Comp', 'Workers\' Comp'),
      intro: L('All company partners must be listed on the policy. Partners who are not listed must present an exemption certificate.', 'Todos os sócios da empresa precisam constar na apólice. Sócios que não forem incluídos precisam apresentar certificado de isenção (exemption).'),
      sections: [
        { title: L('Business', 'Empresa'), fields: [
          req(text('business_name', L('Business name', 'Nome da empresa'))),
          req(text('fein', L('FEIN / EIN number', 'Número FEIN / EIN'))),
          req(text('contact_name', L('Contact name', 'Nome do responsável'), { autocomplete: 'name' })),
          req(yn('exemption', L('Do any of the partners have an exemption certificate?', 'Algum sócio tem certificado de isenção (exemption)?'))),
          when('exemption', 'yes', [req(text('exemption_names', L('Names of the partners with an exemption certificate', 'Nome dos sócios com certificado de isenção')))])[0]
        ].concat(address('', L('Business address', 'Endereço da empresa'), true)).concat([
          req(yn('same_mailing', L('Is the business address the same as the mailing address?', 'O endereço da empresa é o mesmo de correspondência?')))
        ]).concat(when('same_mailing', 'no', address('mail_', L('Mailing address', 'Endereço de correspondência'), true))).concat([
          email(), phone()
        ]) },
        { title: L('Employees and revenue', 'Funcionários e faturamento'), fields: [
          req(text('industry', L('Business industry', 'Ramo de atividade'), { placeholder: L('e.g. flooring, lawn care, cleaning', 'ex.: piso, jardinagem, limpeza') })),
          req(yn('employees', L('Does the business have registered employees?', 'A empresa tem funcionários registrados?'))),
          when('employees', 'yes', [req(text('employees_count', L('How many?', 'Quantos?'), { inputmode: 'numeric', width: 'narrow' }))])[0],
          when('employees', 'yes', [req(money('employees_payroll', L('Yearly amount paid to employees', 'Valor anual pago aos funcionários')))])[0],
          req(yn('subs', L('Does the business use subcontractors?', 'A empresa usa subcontratados?'))),
          when('subs', 'yes', [req(money('subs_payment', L('Yearly amount paid to subcontractors', 'Valor anual pago aos subcontratados')))])[0],
          money('gross_income', L('Annual gross revenue of the business', 'Faturamento bruto anual da empresa'), true),
          req(yn('had_wc', L('Do you have, or have you had, a Workers\' Comp policy?', 'Você tem ou já teve apólice de Workers\' Comp?'))),
          req({ type: 'radio', name: 'coverage', label: L('What coverage limit do you need?', 'Qual limite de cobertura você precisa?'), options: [
            opt('100k', '$100,000'), opt('500k', '$500,000'), opt('1m', '$1,000,000'), opt('unknown', 'I don\'t know', 'Não sei'), opt('other', 'Other', 'Outro')
          ] }),
          when('coverage', 'other', [req(text('coverage_other', L('Which limit?', 'Qual limite?')))])[0]
        ] },
        hearAbout()
      ]
    },

    'auto-dealer': {
      title: L('Auto Dealer', 'Revenda de Veículos (Auto Dealer)'),
      intro: L('Coverage for car dealerships: lot, dealer plates and the people who drive the inventory.', 'Seguro para revendas de carros: pátio, placas de dealer e as pessoas que dirigem o estoque.'),
      sections: [
        { title: L('Business', 'Empresa'), fields: [
          req(text('business_name', L('Business name', 'Nome da empresa'))),
        ].concat(address('', L('Street address', 'Endereço'), true)).concat([
          req(text('responsible_name', L('Full name of the person responsible for the business', 'Nome completo do responsável pela empresa'), { autocomplete: 'name' })),
          text('ssn', L('Social Security number', 'Social Security (SSN)'), { sensitive: true, inputmode: 'numeric', autocomplete: 'off', help: SSN_HELP, width: 'narrow' }),
          email(), phone(),
          text('dealer_plates', L('Number of dealer plates', 'Quantidade de placas de dealer'), { inputmode: 'numeric', width: 'narrow' })
        ]) },
        { title: L('People with access to the cars', 'Pessoas com acesso aos carros'), fields: [{
          type: 'repeat', name: 'people', min: 1, max: 12,
          label: L('Name, position and driver\'s license of ALL people with access to the cars', 'Nome, cargo e carteira de motorista de TODAS as pessoas com acesso aos carros'),
          item: L('Person', 'Pessoa'), add: L('Add another person', 'Adicionar outra pessoa'),
          fields: [
            req(text('name', L('Full name', 'Nome completo'))),
            req(text('position', L('Position', 'Cargo'))),
            req(photos('dl_photo', L('Driver\'s license photo', 'Foto da carteira de motorista'), { multiple: false }))
          ]
        }] },
        { title: L('Lot and inventory', 'Pátio e estoque'), fields: [
          req(yn('out_of_state', L('Will you buy cars outside the state?', 'Vai comprar carros fora do estado?'))),
          money('total_value', L('Total value of the cars on the lot', 'Valor total dos carros no pátio'), true),
          money('avg_value', L('Average value per car', 'Valor médio por carro'), true),
          req(yn('fenced', L('Will the dealership be fenced?', 'O pátio será cercado?'))),
          req(yn('alarm', L('Will it have an alarm system?', 'Terá sistema de alarme?'))),
          req(yn('personal_use', L('Will owners or staff take the cars for personal use?', 'Donos ou funcionários vão usar os carros para uso pessoal?')))
        ] },
        hearAbout()
      ]
    },

    'bond': {
      title: L('Bond', 'Bond (Garantia)'),
      intro: L('Surety bonds for licenses and contracts, such as the dealer bond.', 'Bonds (garantias) exigidos para licenças e contratos, como o dealer bond.'),
      sections: [
        { title: L('Business', 'Empresa'), fields: [
          req(text('business_name', L('Business name', 'Nome da empresa'))),
        ].concat(address('', L('Street address', 'Endereço'), true)).concat([
          req(text('responsible_name', L('Name of the person responsible for the business', 'Nome do responsável pela empresa'), { autocomplete: 'name' })),
          email(), phone()
        ]) },
        { title: L('Responsible person', 'Responsável'), fields: [
          req(photos('dl_photo', L('Driver\'s license photo of the person responsible', 'Foto da carteira de motorista do responsável'), { multiple: false })),
          text('ssn', L('Social Security number', 'Social Security (SSN)'), { sensitive: true, inputmode: 'numeric', autocomplete: 'off', help: SSN_HELP, width: 'narrow' }),
          req(yn('us_citizen', L('U.S. citizen?', 'Cidadão americano?'))),
          when('us_citizen', 'no', [req(yn('green_card', L('Green card holder?', 'Tem green card?')))])[0]
        ] },
        hearAbout()
      ]
    },

    'mobile-home': {
      title: L('Mobile Home', 'Mobile Home'),
      intro: L('Tell us about the owner, the park and the home. The more details, the more accurate the quote.', 'Conte sobre o proprietário, o parque e a casa. Quanto mais detalhes, mais precisa a cotação.'),
      sections: [
        { title: L('Owner', 'Proprietário'), fields: [
          req(text('owner_name', L('Owner\'s full name', 'Nome completo do proprietário'), { autocomplete: 'name' })),
          req({ type: 'date', name: 'owner_dob', label: L('Date of birth', 'Data de nascimento'), autocomplete: 'bday' }),
          text('ssn', L('Social Security number', 'Social Security (SSN)'), { sensitive: true, inputmode: 'numeric', autocomplete: 'off', help: SSN_HELP, width: 'narrow' }),
          email(), phone(),
          req(ny('second_owner', L('Is there a second owner?', 'Existe um segundo proprietário?')))
        ].concat(when('second_owner', 'yes', [
          req(text('second_owner_name', L('Second owner\'s full name', 'Nome completo do segundo proprietário'))),
          req({ type: 'date', name: 'second_owner_dob', label: L('Second owner\'s date of birth', 'Data de nascimento do segundo proprietário') })
        ])) },
        { title: L('Location', 'Localização'), fields: [
          req(text('prop_street', L('Address of the home to be insured', 'Endereço do imóvel a ser segurado'), { width: 'wide' })),
          req(text('lot', L('Lot or park unit number', 'Número do lote ou unidade no parque'), { width: 'narrow' })),
          req(text('prop_city', L('City', 'Cidade'))),
          req(text('prop_zip', L('ZIP Code', 'ZIP Code'), { inputmode: 'numeric', width: 'narrow' })),
          yn('city_limits', L('Is it inside city limits?', 'Fica dentro dos limites da cidade?')),
          text('park_name', L('Park name', 'Nome do parque')),
          req(yn('same_mailing', L('Is this also your mailing address?', 'Este também é seu endereço de correspondência?')))
        ].concat(when('same_mailing', 'no', address('mail_', L('Mailing address', 'Endereço de correspondência'), true))) },
        { title: L('The home', 'A casa'), fields: [
          req({ type: 'radio', name: 'use', label: L('How is the home used?', 'Uso do imóvel'), options: [opt('owner', 'Owner-occupied', 'Moradia própria'), opt('rented', 'Rented', 'Alugado'), opt('seasonal', 'Seasonal', 'Sazonal'), opt('other', 'Other', 'Outro')] }),
          req(yn('age_restricted', L('Does the park have an age restriction?', 'O parque tem restrição de idade?'))),
          req(yn('gated_park', L('Is the park gated?', 'O parque é fechado (com portão)?'))),
          req(yn('fenced', L('Is the property fenced?', 'O terreno é cercado?'))),
          req({ type: 'radio', name: 'size', label: L('Size', 'Tamanho'), options: [opt('single', 'Single wide'), opt('double', 'Double wide'), opt('triple', 'Triple wide')] }),
          req(text('manufacturer', L('Manufacturer', 'Fabricante'))),
          req(text('year_installed', L('Year installed', 'Ano de instalação'), { inputmode: 'numeric', width: 'narrow' }))
        ] },
        { title: L('Structures and features', 'Estruturas e itens'), fields: [
          req(yn('carport', L('Carport?', 'Tem carport (cobertura para carro)?'))),
          req(yn('garage', L('Garage?', 'Tem garagem?')))
        ].concat(when('garage', 'yes', [
          yn('garage_attached', L('Is it attached to the home?', 'É ligada à casa?')),
          text('garage_cars', L('How many cars fit?', 'Cabem quantos carros?'), { inputmode: 'numeric', width: 'narrow' }),
          { type: 'radio', name: 'garage_layout', label: L('How are they parked?', 'Como ficam os carros?'), options: [opt('side', 'Side by side', 'Lado a lado'), opt('tandem', 'One behind the other', 'Um atrás do outro')] }
        ])).concat([req(yn('shed', L('Storage shed or enclosed utility room?', 'Tem depósito (shed) ou cômodo fechado de serviço?')))])
          .concat(when('shed', 'yes', [text('shed_size', L('Size', 'Tamanho'), { placeholder: L('e.g. 10 x 12 ft', 'ex.: 10 x 12 pés'), width: 'narrow' }), yn('shed_attached', L('Is it attached to the home?', 'É ligado à casa?'))]))
          .concat([req(yn('porch', L('Porch?', 'Tem varanda (porch)?')))])
          .concat(when('porch', 'yes', [text('porch_size', L('Size', 'Tamanho'), { placeholder: L('e.g. 8 x 20 ft', 'ex.: 8 x 20 pés'), width: 'narrow' }), yn('porch_screened', L('Is it screened?', 'É telada?')), yn('porch_windows', L('Does it have windows?', 'Tem janelas?'))]))
          .concat([req(yn('florida_room', L('Sunroom / Florida room?', 'Tem sunroom / Florida room?')))])
          .concat(when('florida_room', 'yes', [text('florida_room_size', L('Size', 'Tamanho'), { width: 'narrow' }), yn('florida_room_windows', L('Does it have windows?', 'Tem janelas?')), yn('florida_room_screened', L('Is it screened?', 'É telado?'))]))
          .concat([req(yn('wood_stove', L('Wood stove or fireplace?', 'Tem fogão a lenha ou lareira?')))])
          .concat(when('wood_stove', 'yes', [yn('stove_pro', L('Installed by a professional?', 'Foi instalado por um profissional?'))]))
          .concat([
            req(yn('shutters', L('Hurricane shutters?', 'Tem proteção contra furacão (shutters)?'))),
            req(yn('awning', L('Awning?', 'Tem toldo (awning)?'))),
            req(yn('pool', L('Pool?', 'Tem piscina?')))
          ])
          .concat(when('pool', 'yes', [yn('pool_fenced', L('Is it fenced?', 'É cercada?')), yn('pool_handrail', L('Steps with a handrail?', 'Tem escada com corrimão?'))]))
          .concat([
            req({ type: 'checkboxes', name: 'updates', label: L('Updates done to the home', 'Atualizações feitas na casa'), options: [
              opt('none', 'None', 'Nenhuma'), opt('roof', 'Roof', 'Telhado'), opt('electrical', 'Electrical', 'Elétrica'), opt('plumbing', 'Plumbing', 'Hidráulica'), opt('other', 'Other', 'Outra')
            ] }),
            req(yn('alarm', L('Alarm system?', 'Tem alarme?'))),
            req(yn('animals', L('Any animals?', 'Tem animais?')))
          ]) },
        hearAbout()
      ]
    },

    'barco': {
      title: L('Boat Insurance', 'Seguro de Barco'),
      intro: L('Tell us about the boat, where it is kept and who will operate it.', 'Conte sobre o barco, onde ele fica guardado e quem vai pilotar.'),
      sections: [
        { title: L('Main insured', 'Segurado principal'), fields: [
          req(text('full_name', L('Full name of the main insured', 'Nome completo do segurado principal'), { autocomplete: 'name' })),
          email(), phone(L('Phone number', 'Telefone'))
        ].concat(address('', L('Full address', 'Endereço completo'), true)) },
        { title: L('The boat', 'O barco'), fields: [
          req(text('hin', L('Hull ID number (HIN)', 'Número de identificação do casco (HIN)'), { style: 'uppercase' })),
          req({ type: 'select', name: 'boat_type', label: L('Type of boat', 'Tipo de barco'), options: [
            opt('bowrider', 'Bowrider'), opt('center_console', 'Center console'), opt('cruiser', 'Cabin cruiser'), opt('deck', 'Deck boat'),
            opt('fishing', 'Fishing / bass boat', 'Barco de pesca'), opt('pontoon', 'Pontoon'), opt('pwc', 'Jet ski / personal watercraft', 'Jet ski'),
            opt('sailboat', 'Sailboat', 'Veleiro'), opt('yacht', 'Yacht', 'Iate'), opt('other', 'Other', 'Outro')
          ] }),
          req(text('year', L('Year', 'Ano'), { inputmode: 'numeric', width: 'narrow' })),
          req(text('manufacturer', L('Manufacturer', 'Fabricante'))),
          req(text('model', L('Model', 'Modelo'))),
          req(text('length_ft', L('Length (feet)', 'Comprimento (pés)'), { inputmode: 'decimal', width: 'narrow' })),
          req(text('hull_type', L('Hull construction', 'Material do casco'), { placeholder: L('e.g. fiberglass, aluminum, wood', 'ex.: fibra de vidro, alumínio, madeira') })),
          req(text('engines', L('Number of engines', 'Número de motores'), { inputmode: 'numeric', width: 'narrow' })),
          req(text('engine_make_year', L('Engine make and year', 'Marca e ano do motor'))),
          req(text('horsepower', L('Total horsepower', 'Potência total (HP)'), { inputmode: 'numeric', width: 'narrow' })),
          req({ type: 'date', name: 'purchase_date', label: L('Purchase date', 'Data de compra') }),
          money('purchase_price', L('Purchase price', 'Preço de compra'), true),
          money('total_value', L('Total value of the boat with engine(s)', 'Valor total do barco com motor(es)'), true)
        ] },
        { title: L('Storage', 'Onde o barco fica'), fields: address('storage_', L('Boat storage address', 'Endereço onde o barco fica guardado'), true).concat([
          req(text('storage_type', L('Type of storage', 'Tipo de armazenamento'), { placeholder: L('e.g. garage, driveway, dock, marina', 'ex.: garagem, rua, doca, marina') })),
          req(ny('has_trailer', L('Do you have a trailer?', 'Tem carreta (trailer)?')))
        ]).concat(when('has_trailer', 'yes', [
          text('trailer_vin', L('Trailer VIN', 'VIN da carreta'), { style: 'uppercase' }),
          photos('trailer_vin_photo', L('or photo of the trailer VIN', 'ou foto do VIN da carreta'), { multiple: false, accept: 'image/*' }),
          req(text('trailer_make_model', L('Trailer make and model', 'Marca e modelo da carreta'))),
          money('trailer_value', L('Trailer value', 'Valor da carreta'), true)
        ])).concat(when('has_trailer', 'yes', address('trailer_', L('Trailer storage address, if different from the boat', 'Endereço da carreta, se for diferente do barco'), false))) },
        { title: L('Operators', 'Quem vai pilotar'), fields: [
          req({ type: 'textarea', name: 'operators', label: L('Name, date of birth and marital status of all operators', 'Nome, data de nascimento e estado civil de todos que vão pilotar') }),
          req(photos('dl_photos', L('Photo of the driver\'s license (DL, Brazilian CNH or passport) of ALL operators', 'Foto da carteira de motorista (DL, CNH ou passaporte) de TODOS que vão pilotar'), { help: L('You can select several files.', 'Você pode selecionar vários arquivos.') }))
        ] },
        hearAbout()
      ]
    }
  };

  // Order and short descriptions for the /formularios index page
  var INDEX = [
    ['auto', L('Cars for personal use, including Uber and Lyft.', 'Carros de uso pessoal, inclusive Uber e Lyft.')],
    ['auto-comercial', L('Vans, pickups and trucks used for work.', 'Vans, pickups e caminhões usados no trabalho.')],
    ['residencial', L('Houses, condos and townhomes you own.', 'Casas, condomínios e townhomes próprios.')],
    ['aluguel', L('Your belongings in the home you rent.', 'Seus bens no imóvel que você aluga.')],
    ['general-liability', L('Damage your business causes to others.', 'Danos que sua empresa causa a terceiros.')],
    ['workers-comp', L('Employees injured on the job.', 'Funcionários que se acidentam no trabalho.')],
    ['auto-dealer', L('Car dealerships and dealer plates.', 'Revendas de carros e placas de dealer.')],
    ['bond', L('Surety bonds for licenses and contracts.', 'Garantias exigidas para licenças e contratos.')],
    ['mobile-home', L('Manufactured and mobile homes.', 'Casas pré-fabricadas e mobile homes.')],
    ['barco', L('Boats, jet skis and trailers.', 'Barcos, jet skis e carretas.')]
  ];

  /* ------------------------------------------------------------------
     UI strings
     ------------------------------------------------------------------ */
  var UI = {
    en: {
      required: 'required', optional: 'optional', choose: 'Choose…', remove: 'Remove',
      requiredNote: 'Fields marked * are required.',
      submit: 'Send for quote', sending: 'Sending…',
      errTitle: 'Please check the following:', errRequired: 'This field is required.', errEmail: 'Type a valid email.',
      errPhone: 'Type a valid phone number.', errOneOf: 'Required.',
      consent: 'I agree to be contacted by phone, text, email or WhatsApp about this quote and I accept the',
      privacy: 'Privacy Policy',
      consentErr: 'Please accept to continue.',
      okTitle: 'Thank you! We received your information.',
      okEndpoint: 'A licensed advisor will review it and contact you soon.',
      okWa: 'To finish, send the message we prepared on WhatsApp. If you selected photos, attach them in the same chat.',
      openWa: 'Open WhatsApp',
      filesNote: 'Photos/documents selected on the form',
      ssnNote: 'SSN: I will share it by phone',
      sendErr: 'We could not send the form. Please try again or send it on WhatsApp.',
      tooLarge: 'The photos are too large to send together. Remove some files or send the form on WhatsApp and attach the photos there.',
      sendWa: 'Send on WhatsApp instead',
      waHead: 'New quote request',
      indexTitle: 'Quote forms',
      indexIntro: 'Choose the type of insurance. Each form has the information our advisors need to quote with several carriers.',
      start: 'Start'
    },
    pt: {
      required: 'obrigatório', optional: 'opcional', choose: 'Selecione…', remove: 'Remover',
      requiredNote: 'Campos com * são obrigatórios.',
      submit: 'Enviar para cotação', sending: 'Enviando…',
      errTitle: 'Confira os itens abaixo:', errRequired: 'Campo obrigatório.', errEmail: 'Digite um e-mail válido.',
      errPhone: 'Digite um telefone válido.', errOneOf: 'Obrigatório.',
      consent: 'Concordo em ser contatado por telefone, mensagem, e-mail ou WhatsApp sobre esta cotação e aceito a',
      privacy: 'Política de Privacidade',
      consentErr: 'Aceite para continuar, por favor.',
      okTitle: 'Obrigado! Recebemos suas informações.',
      okEndpoint: 'Um agente licenciado vai analisar e entrar em contato em breve.',
      okWa: 'Para concluir, envie a mensagem que preparamos no WhatsApp. Se você selecionou fotos, anexe na mesma conversa.',
      openWa: 'Abrir WhatsApp',
      filesNote: 'Fotos/documentos selecionados no formulário',
      ssnNote: 'SSN: passo por telefone',
      sendErr: 'Não conseguimos enviar o formulário. Tente de novo ou envie pelo WhatsApp.',
      tooLarge: 'As fotos ficaram grandes demais para enviar juntas. Remova alguns arquivos ou envie pelo WhatsApp e anexe as fotos lá.',
      sendWa: 'Enviar pelo WhatsApp',
      waHead: 'Novo pedido de cotação',
      indexTitle: 'Formulários de cotação',
      indexIntro: 'Escolha o tipo de seguro. Cada formulário tem as informações que nossos agentes precisam para cotar em várias seguradoras.',
      start: 'Preencher'
    }
  }[lang];

  /* ------------------------------------------------------------------
     DOM helpers
     ------------------------------------------------------------------ */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var uid = 0;
  function nextId(name) { uid += 1; return 'f-' + name.replace(/[^a-z0-9]/gi, '-') + '-' + uid; }

  function labelNodes(f) {
    var nodes = [t(f.label)];
    if (f.required) nodes.push(el('span', { class: 'ff-req', 'aria-hidden': 'true', text: ' *' }));
    return nodes;
  }

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */
  function renderField(f, prefix) {
    var name = (prefix || '') + f.name;
    var id = nextId(name);
    var helpId = f.help ? id + '-help' : null;
    var errId = id + '-err';
    var describedBy = [helpId, errId].filter(Boolean).join(' ');
    var wrap = el('div', { class: 'ff-field' + (f.width ? ' ff-field--' + f.width : '') + (f.type === 'radio' || f.type === 'checkboxes' || f.type === 'repeat' || f.type === 'textarea' ? ' ff-field--full' : ''), 'data-name': name });
    if (f.showIf) { wrap.dataset.showField = (prefix || '') + f.showIf.field; wrap.dataset.showValue = f.showIf.value; }
    var help = f.help ? el('p', { class: 'ff-help', id: helpId, text: t(f.help) }) : null;
    var err = el('p', { class: 'ff-error', id: errId, 'aria-live': 'polite' });

    if (f.type === 'repeat') return renderRepeat(f, wrap, help, err);

    if (f.type === 'radio' || f.type === 'checkboxes') {
      var fs = el('fieldset', { class: 'ff-choices', 'aria-describedby': describedBy, 'data-required': f.required ? '1' : null });
      fs.appendChild(el('legend', { class: 'ff-label' }, labelNodes(f)));
      if (help) fs.appendChild(help);
      var group = el('div', { class: 'ff-options' + (f.options.length <= 3 ? ' ff-options--row' : '') });
      f.options.forEach(function (o) {
        var oid = nextId(name + '-' + o.v);
        var input = el('input', { type: f.type === 'radio' ? 'radio' : 'checkbox', id: oid, name: name, value: o.v, 'data-label': t(o.label) });
        group.appendChild(el('label', { class: 'ff-option', for: oid }, [input, el('span', { text: t(o.label) })]));
      });
      fs.appendChild(group);
      fs.appendChild(err);
      wrap.appendChild(fs);
      wrap.dataset.kind = f.type;
      wrap.dataset.label = t(f.label);
      if (f.required) wrap.dataset.required = '1';
      return wrap;
    }

    var label = el('label', { class: 'ff-label', for: id }, labelNodes(f));
    var attrs = {
      id: id, name: name, 'aria-describedby': describedBy, required: f.required ? true : null,
      autocomplete: f.autocomplete || (f.sensitive ? 'off' : null), inputmode: f.inputmode || null,
      placeholder: f.placeholder ? t(f.placeholder) : null, maxlength: f.maxlength || null,
      'data-label': t(f.label), 'data-sensitive': f.sensitive ? '1' : null
    };
    var input;
    if (f.type === 'textarea') input = el('textarea', Object.assign(attrs, { rows: 4 }));
    else if (f.type === 'select') {
      input = el('select', attrs, [el('option', { value: '', text: UI.choose })].concat(f.options.map(function (o) { return el('option', { value: o.v, text: t(o.label) }); })));
    } else if (f.type === 'file') {
      input = el('input', Object.assign(attrs, { type: 'file', accept: f.accept || null, multiple: f.multiple ? true : null }));
    } else {
      input = el('input', Object.assign(attrs, { type: f.type === 'text' ? 'text' : f.type }));
    }
    if (f.style === 'uppercase') input.classList.add('ff-upper');
    wrap.appendChild(label);
    if (help) wrap.appendChild(help);
    if (f.prefix) wrap.appendChild(el('div', { class: 'ff-prefix' }, [el('span', { 'aria-hidden': 'true', text: f.prefix }), input]));
    else wrap.appendChild(input);
    wrap.appendChild(err);
    wrap.dataset.kind = f.type;
    wrap.dataset.label = t(f.label);
    if (f.required) wrap.dataset.required = '1';
    return wrap;
  }

  function renderRepeat(f, wrap, help, err) {
    var fs = el('fieldset', { class: 'ff-repeat' });
    fs.appendChild(el('legend', { class: 'ff-label' }, labelNodes(f)));
    if (help) fs.appendChild(help);
    var list = el('div', { class: 'ff-repeat__list' });
    var count = 0;
    var addBtn = el('button', { type: 'button', class: 'ff-add', text: '+ ' + t(f.add) });

    function renumber() {
      Array.prototype.forEach.call(list.children, function (item, i) {
        item.querySelector('.ff-repeat__title').textContent = t(f.item) + ' ' + (i + 1);
        var rm = item.querySelector('.ff-remove');
        rm.hidden = list.children.length <= (f.min || 0);
        rm.setAttribute('aria-label', UI.remove + ' ' + t(f.item) + ' ' + (i + 1));
      });
      addBtn.hidden = list.children.length >= (f.max || 20);
    }
    function addItem(focus) {
      count += 1;
      var prefix = f.name + '[' + count + '].';
      var item = el('div', { class: 'ff-repeat__item', 'data-one-of': f.oneOf ? f.oneOf.map(function (n) { return prefix + n; }).join(',') : null, 'data-one-of-error': f.oneOfError ? t(f.oneOfError) : null });
      var head = el('div', { class: 'ff-repeat__head' }, [
        el('h4', { class: 'ff-repeat__title' }),
        el('button', { type: 'button', class: 'ff-remove', text: UI.remove, onclick: function () { item.remove(); renumber(); addBtn.focus(); } })
      ]);
      var grid = el('div', { class: 'ff-grid' });
      f.fields.forEach(function (sub) { grid.appendChild(renderField(sub, prefix)); });
      item.appendChild(head);
      item.appendChild(grid);
      if (f.oneOf) item.appendChild(el('p', { class: 'ff-error ff-error--group', 'aria-live': 'polite' }));
      list.appendChild(item);
      renumber();
      if (focus) { var first = item.querySelector('input, select, textarea'); if (first) first.focus(); }
    }
    addBtn.addEventListener('click', function () { addItem(true); });
    for (var i = 0; i < (f.min || 1); i++) addItem(false);
    fs.appendChild(list);
    fs.appendChild(addBtn);
    fs.appendChild(err);
    wrap.appendChild(fs);
    wrap.dataset.kind = 'repeat';
    return wrap;
  }

  /* ------------------------------------------------------------------
     Conditional fields
     ------------------------------------------------------------------ */
  function valueOf(form, name) {
    var inputs = form.querySelectorAll('[name="' + CSS.escape(name) + '"]');
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      if (inp.disabled) continue;
      if (inp.type === 'radio' || inp.type === 'checkbox') { if (inp.checked) return inp.value; }
      else if (inp.value) return inp.value;
    }
    return '';
  }
  function updateConditions(form) {
    // Repeat until stable, because one condition can depend on another (e.g. reason -> closing date)
    for (var pass = 0; pass < 4; pass++) {
      var changed = false;
      form.querySelectorAll('[data-show-field]').forEach(function (w) {
        var show = valueOf(form, w.dataset.showField) === w.dataset.showValue;
        if (w.hidden === !show) return;
        changed = true;
        w.hidden = !show;
        w.querySelectorAll('input, select, textarea, button').forEach(function (inp) { inp.disabled = !show; });
      });
      if (!changed) break;
    }
  }

  /* ------------------------------------------------------------------
     Validation
     ------------------------------------------------------------------ */
  function setError(wrap, msg) {
    var err = wrap.querySelector(':scope > .ff-error, :scope > fieldset > .ff-error, :scope > .ff-prefix ~ .ff-error');
    if (!err) err = wrap.querySelector('.ff-error');
    err.textContent = msg || '';
    wrap.classList.toggle('ff-field--invalid', !!msg);
    wrap.querySelectorAll('input, select, textarea').forEach(function (inp) {
      if (inp.type !== 'radio' && inp.type !== 'checkbox') inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    });
  }
  function isVisible(node, form) {
    for (var n = node; n && n !== form; n = n.parentElement) if (n.hidden) return false;
    return true;
  }
  function validate(form) {
    var problems = [];
    form.querySelectorAll('.ff-field[data-kind]').forEach(function (w) {
      if (w.dataset.kind === 'repeat') return;
      if (!isVisible(w, form)) { setError(w, ''); return; }
      var msg = '';
      var kind = w.dataset.kind;
      if (kind === 'radio' || kind === 'checkboxes') {
        if (w.dataset.required && !w.querySelector('input:checked')) msg = UI.errRequired;
      } else {
        var inp = w.querySelector('input, select, textarea');
        var v = kind === 'file' ? (inp.files && inp.files.length ? 'x' : '') : inp.value.trim();
        if (w.dataset.required && !v) msg = UI.errRequired;
        else if (v && kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = UI.errEmail;
        else if (v && kind === 'tel' && v.replace(/\D/g, '').length < 8) msg = UI.errPhone;
      }
      setError(w, msg);
      if (msg) problems.push({ wrap: w, msg: msg });
    });
    // "VIN or photo" rule inside repeatable items
    form.querySelectorAll('.ff-repeat__item[data-one-of]').forEach(function (item) {
      if (!isVisible(item, form)) return;
      var names = item.dataset.oneOf.split(',');
      var ok = names.some(function (n) {
        var inp = item.querySelector('[name="' + CSS.escape(n) + '"]');
        return inp && (inp.type === 'file' ? inp.files.length > 0 : inp.value.trim());
      });
      var gErr = item.querySelector('.ff-error--group');
      gErr.textContent = ok ? '' : item.dataset.oneOfError;
      if (!ok) problems.push({ wrap: item.querySelector('.ff-field'), msg: item.dataset.oneOfError });
    });
    var consent = form.querySelector('[name="consent"]');
    var cWrap = consent.closest('.ff-consent');
    cWrap.querySelector('.ff-error').textContent = consent.checked ? '' : UI.consentErr;
    if (!consent.checked) problems.push({ wrap: cWrap, msg: UI.consentErr, label: UI.privacy });
    return problems;
  }

  function showSummary(form, problems) {
    var box = form.querySelector('.ff-summary');
    box.innerHTML = '';
    if (!problems.length) { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(el('h2', { text: UI.errTitle }));
    var ul = el('ul');
    problems.forEach(function (p) {
      var target = p.wrap.querySelector('input:not([disabled]), select, textarea');
      var label = p.label || p.wrap.dataset.label || '';
      var a = el('a', { href: '#' + (target ? target.id : ''), text: label + ': ' + p.msg });
      a.addEventListener('click', function (e) { e.preventDefault(); if (target) { target.focus(); target.scrollIntoView({ block: 'center' }); } });
      ul.appendChild(el('li', {}, [a]));
    });
    box.appendChild(ul);
    box.focus();
  }

  /* ------------------------------------------------------------------
     Collect + submit
     ------------------------------------------------------------------ */
  function collect(form) {
    var answers = [];
    var files = [];
    var seen = {};
    form.querySelectorAll('.ff-field[data-kind]').forEach(function (w) {
      if (!isVisible(w, form) || w.dataset.kind === 'repeat') return;
      var kind = w.dataset.kind;
      var label = w.dataset.label;
      var item = w.closest('.ff-repeat__item');
      if (item) label = item.querySelector('.ff-repeat__title').textContent + ' · ' + label;
      var value = '';
      var sensitive = false;
      if (kind === 'radio' || kind === 'checkboxes') {
        value = Array.prototype.map.call(w.querySelectorAll('input:checked'), function (i) { return i.dataset.label; }).join(', ');
      } else if (kind === 'file') {
        var inp = w.querySelector('input');
        Array.prototype.forEach.call(inp.files || [], function (fl) { files.push({ label: label, name: fl.name }); });
        return;
      } else {
        var input = w.querySelector('input, select, textarea');
        value = input.tagName === 'SELECT' ? (input.selectedOptions[0] ? input.selectedOptions[0].textContent : '') : input.value.trim();
        if (input.tagName === 'SELECT' && !input.value) value = '';
        if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          var d = value.split('-');
          value = lang === 'pt' ? d[2] + '/' + d[1] + '/' + d[0] : d[1] + '/' + d[2] + '/' + d[0];
        }
        sensitive = input.dataset.sensitive === '1';
      }
      if (!value || seen[w.dataset.name]) return;
      seen[w.dataset.name] = true;
      answers.push({ name: w.dataset.name, label: label, value: value, sensitive: sensitive });
    });
    return { answers: answers, files: files };
  }

  function waText(formDef, data) {
    var lines = ['*' + UI.waHead + ': ' + t(formDef.title) + '*', ''];
    var hasSensitive = false;
    data.answers.forEach(function (a) {
      if (a.sensitive) { hasSensitive = true; return; }
      lines.push(a.label + ': ' + a.value);
    });
    if (hasSensitive) lines.push(UI.ssnNote);
    if (data.files.length) {
      lines.push('', UI.filesNote + ':');
      data.files.forEach(function (f) { lines.push('- ' + f.label + ': ' + f.name); });
    }
    return lines.join('\n');
  }

  function attribution() {
    try { return JSON.parse(sessionStorage.getItem('ss-attr') || '{}'); } catch (e) { return {}; }
  }

  // Phone photos are often 3–6 MB: resize to max 1600 px JPEG before upload.
  function shrink(file) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || file.size < 500 * 1024 || !window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) {
          resolve(blob && blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file);
        }, 'image/jpeg', 0.82);
      });
    }).catch(function () { return file; });
  }

  function buildPayload(form, slug, def, data, lead) {
    var fd = new FormData();
    var hp = form.querySelector('[name="_gotcha"]');
    fd.append('_gotcha', hp ? hp.value : '');
    fd.append('consent', 'yes');
    fd.append('_form', slug);
    fd.append('_title', t(def.title));
    fd.append('_language', lang);
    fd.append('_page', location.href);
    fd.append('_attribution', JSON.stringify(attribution()));
    fd.append('_name', lead.name || '');
    fd.append('_phone', lead.phone || '');
    var emailAns = data.answers.filter(function (a) { return a.name === 'email'; })[0];
    fd.append('_email', emailAns ? emailAns.value : '');
    fd.append('_answers', JSON.stringify(data.answers.map(function (a) { return { label: a.label, value: a.value }; })));

    var jobs = [];
    var labels = {};
    form.querySelectorAll('.ff-field[data-kind="file"]').forEach(function (w) {
      if (!isVisible(w, form)) return;
      var inp = w.querySelector('input[type="file"]');
      if (!inp || inp.disabled) return;
      var label = w.dataset.label;
      var item = w.closest('.ff-repeat__item');
      if (item) label = item.querySelector('.ff-repeat__title').textContent + ' · ' + label;
      Array.prototype.forEach.call(inp.files || [], function (file) {
        var key = 'file_' + (jobs.length + 1);
        labels[key] = label;
        jobs.push(shrink(file).then(function (f) { return [key, f]; }));
      });
    });
    return Promise.all(jobs).then(function (pairs) {
      var total = 0;
      pairs.forEach(function (p) { total += p[1].size; fd.append(p[0], p[1], p[1].name); });
      fd.append('_file_labels', JSON.stringify(labels));
      if (total > CONFIG.maxUploadBytes) throw Object.assign(new Error('too_large'), { code: 'too_large' });
      return fd;
    });
  }

  function onSubmit(e, form, slug, def, card) {
    e.preventDefault();
    updateConditions(form);
    var problems = validate(form);
    showSummary(form, problems);
    if (problems.length) return;

    var data = collect(form);
    var nameAns = data.answers.filter(function (a) { return /(^|\.)(full_name|owner_name|contact_name|responsible_name|first_name)$/.test(a.name); })[0];
    var phoneAns = data.answers.filter(function (a) { return /^(phone|phone_other)$/.test(a.name); })[0];
    var lead = {
      source: 'quote_form', form: slug, coverage: t(def.title), consent: true,
      name: nameAns ? nameAns.value : '', phone: phoneAns ? phoneAns.value : '',
      fields: data.answers.reduce(function (acc, a) { acc[a.name] = a.value; return acc; }, {})
    };

    var submitBtn = form.querySelector('.ff-submit');
    var status = form.querySelector('.ff-status');

    function success(viaWhatsApp, url) {
      var done = el('div', { class: 'ff-done', tabindex: '-1', role: 'status' }, [
        el('h2', { text: UI.okTitle }),
        el('p', { text: viaWhatsApp ? UI.okWa : UI.okEndpoint })
      ]);
      if (viaWhatsApp) {
        var a = el('a', { class: 'ff-wa', href: url, target: '_blank', rel: 'noopener', text: UI.openWa });
        done.appendChild(a);
      }
      card.innerHTML = '';
      card.appendChild(done);
      done.focus();
      window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 120 });
    }

    function viaWhatsApp() {
      if (site.submitLead) site.submitLead(lead);
      var url = (site.waUrl || function (txt) { return 'https://wa.me/?text=' + encodeURIComponent(txt); })(waText(def, data));
      window.open(url, '_blank', 'noopener');
      success(true, url);
    }
    function fail(message) {
      submitBtn.disabled = false;
      submitBtn.textContent = UI.submit;
      status.textContent = message;
      if (!form.querySelector('.ff-fallback')) {
        var btn = el('button', { type: 'button', class: 'ff-fallback', text: UI.sendWa });
        btn.addEventListener('click', viaWhatsApp);
        status.insertAdjacentElement('afterend', btn);
      }
      status.setAttribute('tabindex', '-1');
      status.focus();
    }

    var endpoint = CONFIG.endpoint || (/^https?:$/.test(location.protocol) ? BASE + 'api/submit' : '');
    if (!endpoint) { viaWhatsApp(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = UI.sending;
    status.textContent = '';
    buildPayload(form, slug, def, data, lead)
      .then(function (fd) {
        return fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
        });
      })
      .then(function (res) {
        if (res.status === 200 && res.body.ok) {
          if (site.submitLead) site.submitLead(lead);
          success(false);
        } else if (res.status === 503 && res.body.code === 'not_configured') {
          viaWhatsApp(); // email delivery not set up yet on the server
        } else {
          fail(res.body.code === 'too_large' ? UI.tooLarge : UI.sendErr + ' (' + (res.body.code || 'http ' + res.status) + (res.body.reason ? ': ' + res.body.reason : '') + ')');
        }
      })
      .catch(function (err) { fail(err && err.code === 'too_large' ? UI.tooLarge : UI.sendErr); });
  }

  function renderForm(root, slug) {
    var def = FORMS[slug];
    if (!def) return;
    document.title = t(def.title) + ' · 4 Savings Solutions';
    var h1 = document.querySelector('[data-ff-title]');
    var intro = document.querySelector('[data-ff-intro]');
    if (h1) h1.textContent = t(def.title);
    if (intro) intro.textContent = t(def.intro);

    var form = el('form', { class: 'ff-form', novalidate: true, 'aria-label': t(def.title) });
    form.appendChild(el('div', { class: 'ff-summary', role: 'alert', tabindex: '-1', hidden: true }));
    // Spam trap: hidden from people, bots fill it in
    form.appendChild(el('div', { class: 'ff-hp', 'aria-hidden': 'true' }, [
      el('label', {}, ['Website', el('input', { type: 'text', name: '_gotcha', tabindex: '-1', autocomplete: 'off' })])
    ]));
    form.appendChild(el('p', { class: 'ff-note', text: UI.requiredNote }));

    def.sections.forEach(function (s, i) {
      var sec = el('section', { class: 'ff-section', 'aria-labelledby': 'ff-sec-' + i });
      sec.appendChild(el('h2', { class: 'ff-section__title', id: 'ff-sec-' + i }, [el('span', { class: 'ff-section__num', 'aria-hidden': 'true', text: String(i + 1).padStart(2, '0') }), t(s.title)]));
      var grid = el('div', { class: 'ff-grid' });
      s.fields.forEach(function (f) { grid.appendChild(renderField(f)); });
      sec.appendChild(grid);
      form.appendChild(sec);
    });

    var consentId = nextId('consent');
    var consentLabel = el('label', { for: consentId }, [
      el('input', { type: 'checkbox', id: consentId, name: 'consent', value: 'yes', required: true }),
      el('span', {}, [UI.consent + ' ', el('a', { href: BASE + (lang === 'pt' ? 'privacidade.html' : 'privacy.html'), target: '_blank', rel: 'noopener', text: UI.privacy }), '.'])
    ]);
    form.appendChild(el('div', { class: 'ff-consent', 'data-label': UI.privacy }, [consentLabel, el('p', { class: 'ff-error', 'aria-live': 'polite' })]));
    form.appendChild(el('button', { type: 'submit', class: 'ff-submit', text: UI.submit }));
    form.appendChild(el('p', { class: 'ff-status', role: 'status' }));

    var card = el('div', { class: 'ff-card' }, [form]);
    root.appendChild(card);

    form.addEventListener('change', function (e) {
      updateConditions(form);
      var w = e.target.closest('.ff-field');
      if (w && w.classList.contains('ff-field--invalid')) setError(w, '');
    });
    form.addEventListener('input', function (e) { if (e.target.classList.contains('ff-upper')) e.target.value = e.target.value.toUpperCase(); });
    form.addEventListener('submit', function (e) { onSubmit(e, form, slug, def, card); });
    updateConditions(form);
  }

  function renderIndex(root) {
    var grid = el('div', { class: 'ff-index' });
    INDEX.forEach(function (row) {
      var def = FORMS[row[0]];
      grid.appendChild(el('a', { class: 'ff-index__card', href: BASE + 'formularios/' + row[0] + '/' + (lang === 'en' ? '?lang=en' : '') }, [
        el('span', { class: 'ff-index__title', text: t(def.title) }),
        el('span', { class: 'ff-index__desc', text: t(row[1]) }),
        el('span', { class: 'ff-index__go', 'aria-hidden': 'true', text: UI.start + ' →' })
      ]));
    });
    root.appendChild(grid);
    var h1 = document.querySelector('[data-ff-title]');
    var intro = document.querySelector('[data-ff-intro]');
    if (h1) h1.textContent = UI.indexTitle;
    if (intro) intro.textContent = UI.indexIntro;
    document.title = UI.indexTitle + ' · 4 Savings Solutions';
  }

  // Static texts in the page shell: <x data-en="..." data-pt="...">
  function translateShell() {
    document.querySelectorAll('[data-en][data-pt]').forEach(function (n) { n.textContent = n.dataset[lang]; });
    document.querySelectorAll('[data-href-en][data-href-pt]').forEach(function (n) { n.setAttribute('href', n.dataset['href' + (lang === 'en' ? 'En' : 'Pt')]); });
    document.querySelectorAll('[data-lang-switch]').forEach(function (a) {
      var target = a.dataset.langSwitch;
      a.setAttribute('href', '?lang=' + target);
      if (target === lang) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function init() {
    translateShell();
    var root = document.getElementById('ff-root');
    if (!root) return;
    if (root.dataset.form) renderForm(root, root.dataset.form);
    else renderIndex(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
