const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Builder, By, until, Select } = require('selenium-webdriver');

const URL = 'https://main.d1z6yy2vi5t54z.amplifyapp.com';

async function abrirNavegador() {
    const driver = await new Builder()
        .forBrowser('chrome')
        .build();

    await driver.get(URL);
    return driver;
}

// TESTE 1: Abrir o site
test('Deve abrir o site Veloz corretamente', async () => {
    const driver = await abrirNavegador();

    try {
        const titulo = await driver.getTitle();

        assert.ok(titulo.includes('Veloz'));

        console.log('Site carregado:', titulo);
    } finally {
        await driver.quit();
    }
});

// TESTE 2: Verificar elementos principais
test('Deve apresentar os principais elementos', async () => {
    const driver = await abrirNavegador();

    try {
        const elementos = [
            'searchForm',
            'location',
            'pickupDate',
            'returnDate',
            'searchModel',
            'category',
            'sort',
            'vehicleGrid',
            'vehicleCount',
            'accountAccess'
        ];

        for (const id of elementos) {
            const elemento = await driver.findElement(By.id(id));
            assert.ok(await elemento.isDisplayed());
        }

        console.log('Todos os elementos foram encontrados!');
    } finally {
        await driver.quit();
    }
});

// TESTE 3: Pesquisar veículo pelo modelo
test('Deve pesquisar veículos pelo modelo', async () => {
    const driver = await abrirNavegador();

    try {
        const pesquisa = await driver.findElement(By.id('searchModel'));

        await pesquisa.sendKeys('Volvo');

        await driver.wait(async () => {
            const resultados = await driver.findElement(By.id('vehicleGrid')).getText();
            return resultados.includes('Volvo XC40');
        }, 5000);

        const resultados = await driver.findElement(By.id('vehicleGrid')).getText();

        assert.ok(resultados.includes('Volvo XC40'));
        assert.ok(!resultados.includes('BMW Série 3'));

        console.log('Pesquisa por modelo funcionando!');
    } finally {
        await driver.quit();
    }
});

// TESTE 4: Filtrar veículos por categoria
test('Deve filtrar veículos da categoria SUV', async () => {
    const driver = await abrirNavegador();

    try {
        const categoria = await driver.findElement(By.id('category'));

        await new Select(categoria).selectByVisibleText('SUV');

        await driver.wait(async () => {
            const resultados = await driver.findElement(By.id('vehicleGrid')).getText();
            return resultados.includes('Volvo XC40');
        }, 5000);

        const resultados = await driver.findElement(By.id('vehicleGrid')).getText();

        assert.ok(resultados.includes('Volvo XC40'));
        assert.ok(resultados.includes('Jeep Compass'));
        assert.ok(!resultados.includes('BMW Série 3'));

        console.log('Filtro de categoria funcionando!');
    } finally {
        await driver.quit();
    }
});

// TESTE 5: Impedir devolução na mesma data da retirada
test('Deve impedir devolução igual à data de retirada', async () => {
    const driver = await abrirNavegador();

    try {
        await driver.executeScript(() => {
            const retirada = document.getElementById('pickupDate');
            const devolucao = document.getElementById('returnDate');

            retirada.value = '2026-11-26';
            devolucao.value = '2026-11-26';

            document.getElementById('searchForm').dispatchEvent(
                new Event('submit', {
                    bubbles: true,
                    cancelable: true
                })
            );
        });

        const toast = await driver.findElement(By.id('toast'));

        await driver.wait(
            until.elementIsVisible(toast),
            5000
        );

        const mensagem = await toast.getText();

        assert.ok(
            mensagem.includes('Escolha uma devolução posterior à retirada.')
        );

        console.log('Validação das datas funcionando!');
    } finally {
        await driver.quit();
    }
});

// TESTE 6: Ordenar veículos pelo menor preço
test('Deve ordenar veículos do menor para o maior preço', async () => {
    const driver = await abrirNavegador();

    try {
        const ordenacao = await driver.findElement(By.id('sort'));

        await new Select(ordenacao).selectByValue('low');

        const grade = await driver.findElement(By.id('vehicleGrid'));

        await driver.wait(async () => {
            const texto = await grade.getText();
            return texto.includes('Hyundai HB20');
        }, 5000);

        const texto = await grade.getText();

        const hb20 = texto.indexOf('Hyundai HB20');
        const onix = texto.indexOf('Chevrolet Onix');
        const civic = texto.indexOf('Honda Civic');

        assert.ok(hb20 < onix);
        assert.ok(onix < civic);

        console.log('Ordenação do menor para o maior preço funcionando!');
    } finally {
        await driver.quit();
    }
});

// TESTE 7: Ordenar veículos pelo maior preço
test('Deve ordenar veículos do maior para o menor preço', async () => {
    const driver = await abrirNavegador();

    try {
        const ordenacao = await driver.findElement(By.id('sort'));

        await new Select(ordenacao).selectByValue('high');

        const grade = await driver.findElement(By.id('vehicleGrid'));

        await driver.wait(async () => {
            const texto = await grade.getText();
            return texto.includes('BMW Série 3');
        }, 5000);

        const texto = await grade.getText();

        const bmw = texto.indexOf('BMW Série 3');
        const volvo = texto.indexOf('Volvo XC40');
        const compass = texto.indexOf('Jeep Compass');

        assert.ok(bmw < volvo);
        assert.ok(volvo < compass);

        console.log('Ordenação do maior para o menor preço funcionando!');
    } finally {
        await driver.quit();
    }
});
// TESTE 8: Abrir a área de acesso à conta
test('Deve abrir a área de acesso à conta', async () => {
    const driver = await abrirNavegador();

    try {
        const botaoConta = await driver.findElement(By.id('accountAccess'));

        await botaoConta.click();

        const dialogo = await driver.findElement(By.id('reservationDialog'));

        await driver.wait(
            until.elementIsVisible(dialogo),
            5000
        );

        assert.ok(await dialogo.isDisplayed());

        console.log('Área de acesso à conta aberta com sucesso!');
    } finally {
        await driver.quit();
    }
});
// TESTE 9: Verificar campos de login
test('Deve apresentar os campos de e-mail e senha', async () => {
    const driver = await abrirNavegador();

    try {
        const botaoConta = await driver.findElement(By.id('accountAccess'));
        await botaoConta.click();

        const dialogo = await driver.findElement(By.id('reservationDialog'));

        await driver.wait(
            until.elementIsVisible(dialogo),
            5000
        );

        const campos = await dialogo.findElements(By.css('input'));

        const tipos = [];

        for (const campo of campos) {
            tipos.push(await campo.getAttribute('type'));
        }

        assert.ok(tipos.includes('email'), 'Campo de e-mail não encontrado');
        assert.ok(tipos.includes('password'), 'Campo de senha não encontrado');

        console.log('Campos de e-mail e senha encontrados!');
    } finally {
        await driver.quit();
    }
});

// TESTE 10: Pesquisar veículo inexistente
test('Deve pesquisar um modelo inexistente sem exibir veículos incompatíveis', async () => {
    const driver = await abrirNavegador();

    try {
        const pesquisa = await driver.findElement(By.id('searchModel'));

        await pesquisa.sendKeys('Ferrari');

        await driver.sleep(1000);

        const resultados = await driver.findElement(By.id('vehicleGrid')).getText();

        const modelos = [
            'Volvo XC40',
            'BMW Série 3',
            'Jeep Compass',
            'Honda Civic',
            'Hyundai HB20',
            'Chevrolet Onix'
        ];

        for (const modelo of modelos) {
            assert.ok(
                !resultados.includes(modelo),
                `O veículo ${modelo} não deveria aparecer na pesquisa por Ferrari`
            );
        }

        console.log('Pesquisa sem veículos correspondentes funcionando!');
    } finally {
        await driver.quit();
    }
});