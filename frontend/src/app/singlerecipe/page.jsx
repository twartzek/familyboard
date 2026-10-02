'use client';

import useSWR from 'swr';
import NavigationButtons from '@/components/NavigationButtons';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { IconButton } from '@mui/material';
import ErrorView from '@/components/ErrorView';

//NOTE: A recipe with several steps should not be merged as below, but rather on separate steps or tabs

const fetcher = (...args) => fetch(...args).then(res => res.json());

function buildIngredients(ingredients) {
  let ingredientsList = [];
  for (let i = 0; i < ingredients.length; i++) {
    let object = {};
    if (ingredients[i].food != undefined) {
      object['name'] = ingredients[i].food.name
        ? ingredients[i].food.name
        : ' ';
      object['unit'] = ingredients[i].unit ? ingredients[i].unit.name : ' ';
      object['amount'] = ingredients[i].amount ? ingredients[i].amount : ' ';
      object['note'] = ingredients[i].note
        ? '(' + ingredients[i].note + ')'
        : '';
      ingredientsList.push(object);
    }
  }

  return ingredientsList;
}

function buildInstruction(instruction) {
  let instructionsList = instruction.split('\n');
  instructionsList = instructionsList.filter(line => line !== '');
  return instructionsList;
}

function Recipe() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const url = 'http://127.0.0.1:3006/api/v1/recipe/?id=' + id;
  const { data, error, isLoading } = useSWR(url, fetcher);

  if (isLoading)
    return (
      <div className="grid h-screen w-screen place-items-center justify-center bg-black text-white">
        <div>
          <Box sx={{ display: 'flex' }}>
            <CircularProgress />
          </Box>
          Loading...
        </div>
      </div>
    );
  if (error)
    return (
      <div className="grid h-screen w-screen place-items-center justify-center bg-black text-white">
        <div>
          <ErrorView error={error} />
        </div>
      </div>
    );

  if (!data.steps) {
    return (
      <div className="flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
        {/* <header className="h-10 bg-red-500">Header</header>  */}
        <main className="h-[97dvh] flex-grow bg-black"></main>
        <footer className="flex h-[3dvh] items-center justify-center bg-black">
          <NavigationButtons />
        </footer>
      </div>
    );
  }

  function mergeIngredients(data) {
    return data.steps.reduce((acc, step) => acc.concat(step.ingredients), []);
  }

  function mergeInstructions(data) {
    return data.steps.reduce((acc, step) => acc + '\n' + step.instruction, '');
  }

  const ingredients = buildIngredients(mergeIngredients(data));
  const instrList = buildInstruction(mergeInstructions(data)); //data.steps[0].instruction

  return (
    <div className="flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      {/* <header className="h-10 bg-red-500">Header</header> */}
      <main className="h-[97dvh] flex-grow bg-black">
        <div className="relative h-[20dvh]">
          <img
            src={data.image}
            alt="Rezept"
            className="absolute h-full w-full rounded-t object-cover"
          />
        </div>
        <div className="p-1 text-center font-[family-name:var(--font-fredericka)] text-3xl font-bold text-white">
          {data.name}
        </div>
        <div className="h-[74dvh] touch-auto overflow-y-auto">
          <IngredientsToTable
            ingredients={ingredients}
            initServings={Math.max(1, data.servings)}
          />
          <div className="p-8 font-[family-name:var(--font-fredericka)] text-3xl font-bold text-slate-500">
            Zubereitung
          </div>
          <div className="">
            {instrList ? (
              instrList.map((item, index) => (
                <div key={index} className="p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-yellow-200 p-1 text-2xl font-bold text-yellow-200">
                    {index + 1}
                  </div>
                  <div className="text-xs">
                    <br />
                  </div>
                  <div className="ml-4 border-l-2 border-yellow-200 pl-4 text-2xl text-slate-100">
                    {item}
                  </div>
                </div>
              ))
            ) : (
              <h1>loading...</h1>
            )}
          </div>
        </div>
      </main>
      <footer className="flex h-[3dvh] items-center justify-center bg-black">
        <NavigationButtons />
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid h-screen w-screen place-items-center justify-center bg-black text-white">
          <div>
            <Box sx={{ display: 'flex' }}>
              <CircularProgress />
            </Box>
            Loading...
          </div>
        </div>
      }
    >
      <Recipe />
    </Suspense>
  );
}

function IngredientsToTable({ ingredients, initServings }) {
  const [servings, setServings] = useState(initServings);

  const handleIncrease = () => {
    setServings(servings + 1);
  };

  const handleDecrease = () => {
    setServings(Math.max(0, servings - 1));
  };

  return (
    <div className="grid w-full grid-cols-1 text-white">
      <div className="">
        <div className="pl-8 pt-4 font-[family-name:var(--font-fredericka)] text-3xl font-bold text-slate-500">
          Zutaten
        </div>
        <div className="flex items-center pl-8">
          <div className="mr-2">Portionen: </div>
          <IconButton
            aria-label="remove"
            color="primary"
            onClick={handleDecrease}
          >
            <RemoveCircleOutlineIcon />
          </IconButton>
          <div className="min-w-8 text-center">{servings}</div>
          <IconButton aria-label="add" color="primary" onClick={handleIncrease}>
            <AddCircleOutlineIcon />
          </IconButton>
        </div>
      </div>

      <div className="pl-8">
        <table className="w-3/5 text-2xl">
          <tbody>
            {ingredients ? (
              ingredients.map((ingredient, index) => (
                <tr
                  className="border-b border-solid border-slate-400"
                  key={index}
                >
                  <td className="min-w-16 text-left text-slate-100">
                    {(
                      (ingredient.amount * servings) /
                      initServings
                    ).toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                    {/* {ingredient.unit} */}
                  </td>
                  <td className="text-left text-slate-100">
                    {ingredient.unit}
                  </td>
                  <td className="text-left text-slate-100">
                    {ingredient.name}
                    <span className="font-italic pl-2 text-base text-slate-400">
                      {ingredient.note}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <h1>data not available...</h1>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
