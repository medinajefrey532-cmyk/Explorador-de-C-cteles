
const API_BASE = "https://www.thecocktaildb.com/api/json/v1/1";

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const cocktailGrid = document.getElementById("cocktailGrid");
const statusElement = document.getElementById("status");
const resultCount = document.getElementById("resultCount");

const quickButtons = document.querySelectorAll(".quick-btn");

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
        showStatus("Escribe el nombre de un cóctel o ingrediente.", true);
        return;
    }

    const searchType = document.querySelector(
        'input[name="searchType"]:checked'
    ).value;

    await searchCocktails(query, searchType);
});

quickButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        searchInput.value = button.dataset.query;
        await searchCocktails(button.dataset.query, "name");
    });
});

async function searchCocktails(query, type) {
    cocktailGrid.replaceChildren();
    resultCount.textContent = "";
    showStatus("Buscando recetas...");

    searchButton.disabled = true;
    searchButton.textContent = "Buscando...";

    try {
        let url;

        if (type === "name") {
            url = `${API_BASE}/search.php?s=${encodeURIComponent(query)}`;
        } else {
            url = `${API_BASE}/filter.php?i=${encodeURIComponent(query)}`;
        }

        const data = await fetchJSON(url);

        if (!data.drinks || data.drinks.length === 0) {
            showStatus(
                "No encontramos cócteles con ese criterio. " +
                "Prueba otro nombre o ingrediente."
            );
            return;
        }

        let cocktails;

        if (type === "ingredient") {
            // filter.php solo devuelve información básica.
            // Consultamos los detalles de cada receta.
            const selectedDrinks = data.drinks.slice(0, 12);

            const details = await Promise.all(
                selectedDrinks.map(async (drink) => {
                    try {
                        const detailData = await fetchJSON(
                            `${API_BASE}/lookup.php?i=${encodeURIComponent(drink.idDrink)}`
                        );

                        return detailData.drinks?.[0] ?? null;
                    } catch (error) {
                        console.error(
                            `No se pudo cargar ${drink.strDrink}:`,
                            error
                        );
                        return null;
                    }
                })
            );

            cocktails = details.filter(Boolean);
        } else {
            cocktails = data.drinks;
        }

        if (cocktails.length === 0) {
            showStatus("No fue posible cargar los detalles de las recetas.", true);
            return;
        }

        displayCocktails(cocktails);
        statusElement.textContent = "";
        resultCount.textContent =
            `${cocktails.length} receta${cocktails.length === 1 ? "" : "s"}`;

    } catch (error) {
        console.error("Error consultando la API:", error);
        showStatus(
            "No pudimos conectar con el servicio. " +
            "Comprueba tu conexión e inténtalo nuevamente.",
            true
        );
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Buscar recetas";
    }
}

async function fetchJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
    }

    return response.json();
}

function displayCocktails(cocktails) {
    cocktailGrid.replaceChildren();

    cocktails.forEach((cocktail) => {
        const card = document.createElement("article");
        card.className = "cocktail-card";

        const image = document.createElement("img");
        image.className = "cocktail-image";
        image.src = cocktail.strDrinkThumb || "";
        image.alt = `Cóctel ${cocktail.strDrink}`;
        image.loading = "lazy";

        image.addEventListener("error", () => {
            image.removeAttribute("src");
            image.alt = "Imagen no disponible";
        }, { once: true });

        const content = document.createElement("div");
        content.className = "card-content";

        const category = document.createElement("span");
        category.className = "card-category";
        category.textContent =
            cocktail.strCategory || "Cóctel";

        const title = document.createElement("h3");
        title.textContent = cocktail.strDrink || "Sin nombre";

        const meta = document.createElement("p");
        meta.className = "card-meta";
        meta.textContent = [
            cocktail.strAlcoholic,
            cocktail.strGlass ? `Vaso: ${cocktail.strGlass}` : ""
        ].filter(Boolean).join(" · ");

        const ingredientsTitle = document.createElement("h4");
        ingredientsTitle.textContent = "Ingredientes";

        const ingredientList = document.createElement("ul");
        ingredientList.className = "ingredient-list";

        for (let i = 1; i <= 15; i++) {
            const ingredient = cocktail[`strIngredient${i}`]?.trim();

            if (!ingredient) continue;

            const measure = cocktail[`strMeasure${i}`]?.trim();

            const item = document.createElement("li");
            const ingredientName = document.createElement("span");
            const ingredientMeasure = document.createElement("span");

            ingredientName.textContent = ingredient;
            ingredientMeasure.textContent = measure || "Al gusto";

            item.append(ingredientName, ingredientMeasure);
            ingredientList.appendChild(item);
        }

        const instructionsTitle = document.createElement("h4");
        instructionsTitle.textContent = "Preparación";

        const instructions = document.createElement("p");
        instructions.className = "instructions";
        instructions.textContent =
            cocktail.strInstructions || "No hay instrucciones disponibles.";

        content.append(
            category,
            title,
            meta,
            ingredientsTitle,
            ingredientList,
            instructionsTitle,
            instructions
        );

        card.append(image, content);
        cocktailGrid.appendChild(card);
    });
}

function showStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
}
