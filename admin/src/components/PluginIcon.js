import React from 'react';

const PluginIcon = () =>
    React.createElement(
        'svg',
        {
            'aria-hidden': 'true',
            focusable: 'false',
            viewBox: '0 0 24 24',
            width: '2rem',
            height: '2rem',
            fill: 'currentColor'
        },
        React.createElement('path', {
            d: 'M12 2 4 5v6c0 5.25 3.4 10.16 8 11.75 4.6-1.59 8-6.5 8-11.75V5l-8-3Zm0 2.12 6 2.25V11c0 4.2-2.64 8.26-6 9.66C8.64 19.26 6 15.2 6 11V6.37l6-2.25Zm-1 4.38v7l5-3.5-5-3.5Z'
        })
    );

export default PluginIcon;
