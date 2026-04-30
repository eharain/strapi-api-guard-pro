import pluginPkg from '../../package.json';
import PluginIcon from './components/PluginIcon';
import { getTrad } from './utils';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${name}`,
      icon: PluginIcon,
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'API Guard Pro'
      },
      Component: async () => {
        const { default: App } = await import('./App.jsx');
        return App;
      }
    });
    
    app.registerPlugin({
      id: name,
      name
    });
  },
  
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map(locale => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => ({
            data,
            locale
          }))
          .catch(() => ({ data: {}, locale }));
      })
    );
    
    return Promise.resolve(importedTrads);
  }
};
