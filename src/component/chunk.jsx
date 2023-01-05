import React, { useEffect, useState } from "react";
import { Proskomma } from "proskomma";

async function initVerses() {
    const pk = new Proskomma();
    const book_usx = document.getElementById("chunkingComponent").getAttribute("data-usx");

    const formatted = `
        <usx version="2.0">
        <chapter number="1" style="c"/>
        ${book_usx}
        `;

    const mutationQuery = `mutation { 
            addDocument(
                selectors: [{key: "lang", value: "eng"}, {key: "abbr", value: "ust"}],
                contentType: "usx",
                content: """${formatted}"""
            )
        }`;

    const result = await pk.gqlQuery(mutationQuery);

    const verses = await loadChapterTextByVerses(pk);
    return verses;
}

async function loadChapterTextByVerses(pk) {
    const versesQuery = `{
        documents {
           cv(chapterVerses:"1") {
              text(normalizeSpace: true)
           }
        }
     }`;

    const result = await pk.gqlQuery(versesQuery);

    const versesList = result["data"]["documents"][0]["cv"].map(x => x.text);
    return versesList;
}

function Chunk() {

    const [unchunkedVerses, setUnchunkedVerses] = useState([]);
    const [chunkedVerses, setChunkedVerses] = useState([]);
    const [redoChunk, setRedoChunk] = useState([]);
    const [checkedState, setCheckedState] = useState(new Array(chunkedVerses.length).fill(false));

    async function init() {
        const verses = await initVerses();
        setUnchunkedVerses(verses);
        setCheckedState(new Array(verses.length).fill(false));
    }

    useEffect(() => {
        (async () => {
            init();
        })();
    }, []);

    function handleSelectChunk(index) {
        switch (checkedState[index]) {
            case true: unselectFrom(index);
            case false: selectTo(index);
        }
    }

    function unselectFrom(index) {
        const newState = checkedState.map((value, i) => {
            return (i >= index) ? false : true;
        })
        setCheckedState(newState);
    }

    function selectTo(index) {
        const newState = checkedState.map((value, i) => {
            return (i <= index) ? true : false;
        })
        setCheckedState(newState);
    }

    function chunkSelected() {
        const lastChunk = checkedState.lastIndexOf(true);
        if (lastChunk == -1) return;

        const chunkList = unchunkedVerses.slice(0, lastChunk + 1).map((item) => { return item });
        const newChunks = [...chunkedVerses, chunkList];
        setChunkedVerses(newChunks);

        const unChunkedList = unchunkedVerses.slice(lastChunk + 1, undefined).map((item) => { return item });
        setUnchunkedVerses(unChunkedList);
        setCheckedState(new Array(unChunkedList.length).fill(false));
    }

    function undo() {
        const popped = chunkedVerses.pop();
        setUnchunkedVerses([...popped, ...unchunkedVerses]);
        setChunkedVerses[[...chunkedVerses]];
        setCheckedState(new Array(unchunkedVerses.length + popped.length).fill(false));
        setRedoChunk(popped);
    }

    function redo() {
        selectTo(redoChunk.length);
        setRedoChunk([]);
    }

    function formatVerse(chunkStart, verses) {
        return verses
            .map(
                (item, index) => {
                    return `<verse number="${chunkStart + index}" style="v" />${item}`;
                }
            )
            .reduce(
                (accumulator, currentValue) => accumulator + currentValue,
                ""
            );
    }

    function getUSXByVerses(bookUsx) {
        const splitBook = bookUsx.split("<verse number");

        if (splitBook.length < 1) return [];
        if (splitBook.length < 2) return [`<verse number${splitBook[0]}`];

        // merge pre-verse content with the first verse
        const firstElement = splitBook.shift();
        splitBook[0] = `${firstElement}<verse number${splitBook[0]}`;

        for (let i = 1; i < splitBook.length; i++) {
            splitBook[i] = `<verse number${splitBook[i]}`;
        }
        return splitBook;
    }

    function preparePost() {
        const result = {};
        let chunkStart = 1;
        const book_usx = document.getElementById("chunkingComponent").getAttribute("data-usx");
        const verses_usx = getUSXByVerses(book_usx);
        chunkedVerses.forEach((item) => {
            result[chunkStart] = verses_usx.slice(chunkStart - 1, chunkStart + item.length).join("");
            chunkStart += item.length;
        });
        return result;
    }

    function submit() {
        const postData = preparePost();
        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        })
            .then(response => response.json())
            .then(response => console.log(JSON.stringify(response)))
            .catch((error) => {
                console.error(error);
            });
    }

    return (
        <>
            <>
                {chunkedVerses.map(
                    (chunks, index) => {
                        return <div key={index}>
                            {chunks.map((item, idx2) => {
                                return <div><span>{item}</span><br /></div>;
                            })}
                            <hr></hr>
                        </div>;
                    })
                }
            </>
            <>
                {unchunkedVerses.map((item, index) => {
                    return <div key={index}>
                        <input
                            value={item}
                            type="checkbox"
                            checked={checkedState[index] ?? false}
                            onChange={
                                () => {
                                    handleSelectChunk(index);
                                }
                            }
                        />
                        <span>{item}</span>
                    </div>;
                })
                }
            </>
            <>
                <button disabled={chunkedVerses.length < 1} onClick={() => { undo(); }}>Undo</button>
                <button disabled={unchunkedVerses.length < 1} onClick={() => { chunkSelected() }}>Chunk</button>
                <button disabled={redoChunk.length < 1} onClick={() => { redo(); }}>Redo</button>
            </>
            <button disabled={unchunkedVerses.length > 0} onClick={() => { submit(); }}>Submit</button>
        </>
    );
};

export default Chunk;