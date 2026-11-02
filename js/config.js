// Site configuration. Nothing secret belongs in this file: it is public on GitHub Pages.
// mode: 'demo' uses invented sample data and shows a Demo Mode banner.
//       'live' talks to the martha-web Supabase Edge Function.
window.MARTHA_CONFIG = {
  mode: 'live',
  apiBase: 'https://yyagaobrlkcrdyqwkure.supabase.co/functions/v1/martha-web',
  telegramBot: 'https://t.me/martha_management_bot',
};
