import { create } from "zustand";
//used to create a store -a centralized place to keep app’s state and actions. also returns custom react hooks like useeditorstore
type FileType = { //define the struct of file object
  id: string; //unique identifier for the file 
  name: string; //file name
  language: string; //programming language 
  content: string; //actual content in the file 
};

type EditorState = { //define the overall state struct 
  files: FileType[]; //array of all files in the editor 
  openTabs: string[]; //array of file ids opened as tabs 
  activeFileId: string; //id of current/active file
//They describe the actions Zustand store can perform to mutate (change) the state.
  createFile: () => void; //Adds a new file to the files array
  openFile: (id: string) => void;//opens a file by its ID, adds it to openTabs, and sets it as the active file.
  setActiveFile: (id: string) => void; //Switches the currently active file to the one with the given ID.
  updateFileContent: (id: string, content: string) => void; //Updates the text inside a file.
};

const loadFromStorage = () => { 
  //checks if the code is running in a browser  (not server-side)
  //arrow fun is assigned to this constant which will try to load saved editor state from the browser’s local storage.
  if (typeof window === "undefined") return null; //chwcks if glowbal window object exists i
  const data = localStorage.getItem("ignis-editor"); //localstorage is browser api for storing key value pairs
  //retrieves the value saved under the key "ignis-editor"
  return data ? JSON.parse(data) : null; //convert the json string data into proper js obj 
};

//arrow fun takes an argument which is an obj which uses all or sm properties of editorstate
//partial<t> is a ts utility that makes all prop optional , in that way dont need to pass the whole editor state , just the parts i want to save
const saveToStorage = (state: Partial<EditorState>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("ignis-editor", JSON.stringify(state));
};//Converts state into a JSON string and saves it under the key "ignis-editor".
 
//useeditorstore is the custom hook to be used in react components
//create<EditorState> is used to create a zustand state 
//set and get are the two helpers to update the state and read the current state 
export const useEditorStore = create<EditorState>((set, get) => {
  const stored = loadFromStorage();
// tries to restore saved state from localStorage.
// If nothing is saved, it falls back to a default state
  const initialState: EditorState = stored || {
    files: [
      {
        id: "1",
        name: "main.js",
        language: "javascript",
        content: "// Start coding in Ignis",
      },
    ],
    openTabs: ["1"],
    activeFileId: "1",
//functions are placeholders for now 
    createFile: () => {},
    openFile: () => {},
    setActiveFile: () => {},
    updateFileContent: () => {},
  };

//Spreads the initial state into the store.
//Then overrides the placeholder functions with real implementations
  return {
    ...initialState, //1. Take all the data (files, tabs) from initialState like blueprint
    //The ... is called the spread operator. It takes an existing object and "spreads" its contents out into a new object.

    createFile: () => { //2. OVERRIDE the placeholder with real logic
      const id = Date.now().toString(); //generates a new id using current timestamp
      const newFile = { //new file obj is created 
        id,
        name: `file${get().files.length + 1}.js`, //` is template literal ,It dynamically names file based on how many files already exist. If 2 files, then file3.js.
        language: "javascript",
        content: "//weave your visions", //initialize the file as blank
      };

      const newState = { //adds new file to the files array at the end
        files: [...get().files, newFile], //Take the current list of files and spread them out."
      };

      set(newState); //update the state with the new files array
      saveToStorage({ ...get(), ...newState }); //saves the updated state to local storage
    },

    openFile: (id) => { //3. OVERRIDE with real logic
      const newState = {
        openTabs: get().openTabs.includes(id) //: This checks if the ID of the file you clicked is already in the list of currently open tabs.
          ? get().openTabs //If true (It's already open): Just return get().openTabs. Do nothing new.
          : [...get().openTabs, id], //If false (It's not open): Create a new array, spread the current tabs into it, and add the new id to the end.
        activeFileId: id, //Regardless of whether the tab was already open, make this file the active one
      };

      set(newState);
      saveToStorage({ ...get(), ...newState });
    },

    setActiveFile: (id) => {
      set({ activeFileId: id });
      saveToStorage({ ...get(), activeFileId: id });
    },

    updateFileContent: (id, content) => { //it runs every single time the user types a character in the editor.
      const updatedFiles = get().files.map((file) => //creates a new array by looping through all existing files
        file.id === id ? { ...file, content } : file
      );//file.id ==id For every file in the list, it checks if it's the one currently being edited.
      //If it is the right file, it uses the spread operator to copy all properties of old file obj, but overwrites the content property with the new text from the editor.

      set({ files: updatedFiles });
      saveToStorage({ ...get(), files: updatedFiles });
    },
  };
});
