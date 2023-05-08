import ForgeUI, { render, Fragment, Text, IssuePanel, Table, Cell, useEffect, Form, SectionMessage, DatePicker, Select, Option, useState, Toggle, TextArea, useProductContext, Button, TextField, Row } from '@forge/ui';
import api, { storage, route } from "@forge/api";

const App = () => {
  const STORAGE_KEY_PREFIX = "CB_CONFIGURATION_DATA";
  // useState is a UI kit hook we use to manage the form data in local state
  const [formState, setFormState] = useState();
  const [jiraUser, setJiraUser] = useState();
  const [issueData, setIssueData] = useState();
  const [storageData] = useState(async () => await storage.get(`${STORAGE_KEY_PREFIX}`));
  const [trasfertaVisible, setTrasfertaVisible] = useState(false);
  const [errorString, setErrorString] = useState();
  const [successString, setSuccessString] = useState();
  const { platformContext: { issueKey }, accountId } = useProductContext(); // Get the context issue key

  const selectTipoIntervento = [
    { label: "Esterno", value: "esterno", defaultSelected: false },
    { label: "Interno", value: "interno", defaultSelected: true },
    { label: "Teleassistenza", value: "teleassistenza", defaultSelected: false }
  ];

  // On start i collect logged jira user data
  useEffect(async () => {
    const response = await api.asUser().requestJira(route`/rest/api/3/myself`);
    await checkResponse('Jira API', response);
    setJiraUser(await response.json()); // se setto solamente una variabile, essa non viene aggiornata in grafica
  }, []);

  // On start, i collect context data (issue name and description, project name)
  useEffect(async () => {
    const response = await api.asApp().requestJira(route`/rest/api/2/issue/${issueKey}`);
    await checkResponse('Jira API', response);
    setIssueData((await response.json()).fields);
  }, []); // se metti qualcosa nell array in dipendenza, appena questa cambia il suo valore, questa function viene rieseguita

  // Jira Plugin is published on AWS, i needed to know the public ip of published plugin
  useEffect(async () => {
    const translateRespons1e = await api.fetch("https://api.db-ip.com/v2/free/self",
      { method: 'GET'}
    );
    await checkResponse('TEST API', translateRespons1e);
  }, []);

  const showHideTrasferta = () => { 
    setTrasfertaVisible(!trasfertaVisible);
  }

  // sulla submit del form, voglio creare anche un registro di lavoro Jira, e aggiorna il tracciamento temporale del progetto
  const createWorkLog = async (secondiWorkLog, dataInizio) => {
    var bodyData = `{"timeSpentSeconds": ${secondiWorkLog}, "started": "${dataInizio + "T03:00:00.000+0000"}"}`;
    const response = await api.asUser().requestJira(route`/rest/api/2/issue/${issueKey}/worklog`, {
      method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: bodyData
    });
    await checkResponse('CB API', response);
  }

  // Handles form submission, which is a good place to call APIs, or to set component state...
  const onSubmit = async (formData) => {
    const translateRespons1e = await api.fetch("https://aaa",
      { method: 'GET'}
    );
    await checkResponse('CB API', translateRespons1e);
    // authenticazione e successivamente invio dati al nostro server
    const translateResponse = await api.fetch(storageData.CB_CONF_SERVERURL,
      { method: 'POST',  headers: {'Content-Type': 'application/json; charset=UTF-8'},
        body: JSON.stringify({
        "username": storageData.CB_CONF_USERNAME,
        "password": storageData.CB_CONF_PASSWORD,
      })
    });
    await checkResponse('CB API', translateResponse);

    setErrorString(undefined);
    setSuccessString(undefined);
    /** formData: { username: 'Username', products: ['jira'] }*/
    formData.CB_commessa = issueData?.project?.name.split('[').pop().split(']')[0];
    formData.CB_oggetto = "Rapportino d'intervento";
    formData.CB_user = jiraUser?.emailAddress;
    setFormState(formData); // aggiorno la variabile formData, con i dati inseriti dall utente nel form
    const secondiWorkLog = formData.CB_workTime * 60 * 60;
    createWorkLog(secondiWorkLog, formData.CB_executionDate);

    // post dati server... se ok:
    setSuccessString("Creazione rapportino eseguita.");
  };

  return (
    <Fragment>
      <Form onSubmit={onSubmit} onFinish={(values) => this.handleFormSubmit(values)} submitButtonText="Crea Rapportino">
            {<Table>
                <Row>
                  <Cell>
                    <DatePicker name="CB_executionDate" label="Data Intervento" defaultValue={new Date().toLocaleDateString('en-CA')} isRequired />
                  </Cell>
                  <Cell>
                    <TextArea name="CB_description" label="Descrizione attività" isRequired defaultValue={issueData?.description}/>
                  </Cell>
                </Row>
                <Row>
                  <Cell>
                    <TextField name="CB_workTime" label="Tempo Impiegato in ore" type="number" isRequired />
                  </Cell>
                </Row>
                <Row>
                  <Cell>
                    <Select label="Tipo Intervento" name="CB_tipoIntervento" isRequired>
                      {selectTipoIntervento.map(el => <Option label={el.label} value={el.value} defaultSelected={el.defaultSelected}></Option>)}
                    </Select>
                  </Cell>
                 
                  <Cell>
                    {  !trasfertaVisible ?
                      <Button onClick={showHideTrasferta} text='Aggiungi trasferta'></Button> :
                      <Button onClick={showHideTrasferta} text='Rimuovi trasferta'></Button>}
                  </Cell>
                </Row>
                <Row>
                  <Cell>
                  {  trasfertaVisible ?
                    <TextField name="CB_oreViaggio" label="Ore viaggio" type="number" isRequired />
                    : null}
                  </Cell>
                  <Cell>
                  {  trasfertaVisible ?
                    <TextField name="CB_kmtotali" label="KM andata e ritorno" placeholder='Km percorsi andata e ritorno' isRequired type='number' />
                    : null}
                  </Cell>
                </Row>
            </Table>
          }
      </Form>
      {
        successString && successString != "" ?
          <SectionMessage appearance='confirmation'>
            <Text>{successString}</Text>
          </SectionMessage>
          : null
      }
      {
        errorString && errorString != "" ?
          <SectionMessage appearance='error'>
            <Text>{errorString}</Text>
          </SectionMessage>
          : null
      }

    </Fragment>
  );
};

export const run = render(
  <IssuePanel>
    <App />
  </IssuePanel>
);

/**
 * Checks if a response was successful, and log and throw an error if not.
 * Also logs the response body if the DEBUG_LOGGING env variable is set.
 * @param apiName a human readable name for the API that returned the response object
 * @param response a response object returned from `api.fetch()`, `requestJira()`, or similar
 */
 async function checkResponse(apiName, response) {
  if (!response.ok) {
    const message = `Error from ${apiName}: ${response.status} ${await response.text()}`;
    console.error(JSON.stringify(response));
    throw new Error(message);
  } else if (true) {
    console.warn(`Response from ${apiName}: ${await response.text()}`);
  }
}
