import ForgeUI, { render, AdminPage, Fragment, Form, useState, useEffect, SectionMessage, TextField } from '@forge/ui';
import { storage } from '@forge/api';

const App = () => {
    const STORAGE_KEY_PREFIX = "CB_CONFIGURATION_DATA";
    // inizializzo le variabili
    const [projectConfigState, setProjectConfigState] = useState(undefined);
    const [isConfigSubmitted, setConfigSubmitted] = useState(false);
    
    // questa funzione viene lanciata appena la pagina viene caricata, ed ogni volta che il valore del secondo parametro "cambia"
    // lo scopo è quello di caricare i dati salvati nel localStorage, se ci sono
    useEffect(async () => {
        const storageData = await storage.get(`${STORAGE_KEY_PREFIX}`);
        setProjectConfigState(storageData);
    }, [projectConfigState]);
    
    // sul submit della form, salviamo i dati nel localStorage del nostro plugin
    const onProjectConfigSubmit = async (serverConfig) => {
        await storage.set(`${STORAGE_KEY_PREFIX}`, serverConfig);
        setProjectConfigState(serverConfig);
        setConfigSubmitted(true);
    };

    // creazione grafica della form di inserimento e visualizzazione dati
    return (
        <Fragment>
            {isConfigSubmitted && <SectionMessage title="Configurazione Salvata" appearance="confirmation"/>}
            {<Form onSubmit={onProjectConfigSubmit} submitButtonText="Salva">
                <TextField label="Server URL" name="CB_CONF_SERVERURL" defaultValue={projectConfigState?.CB_CONF_SERVERURL} />
                <TextField label="WebApi Username" name="CB_CONF_USERNAME" defaultValue={projectConfigState?.CB_CONF_USERNAME} />
                <TextField label="WebApi Password" name="CB_CONF_PASSWORD" type='password' defaultValue={projectConfigState?.CB_CONF_PASSWORD} />
            </Form>}
        </Fragment>
    );
};

export const run = render(
    <AdminPage>
        <App />
    </AdminPage>
);
